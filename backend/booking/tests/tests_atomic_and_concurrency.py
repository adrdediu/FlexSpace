"""
tests_atomic_and_concurrency.py

Tests for:
  1. Atomic transactions — desk state consistency during booking operations
  2. Concurrency / race conditions — two users booking the same desk simultaneously
  3. Booking ownership — users cannot cancel other users' bookings
  4. Task transactions — Celery tasks update desk state atomically
"""
import pytest
import threading
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.db import transaction, connections

from booking.models import Booking, Desk, UserGroup


# ─── Helpers ──────────────────────────────────────────────────────────────────

def future(hours=1):
    return timezone.now() + timedelta(hours=hours)

def past(hours=1):
    return timezone.now() - timedelta(hours=hours)

def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def grant_access(user, room, location, name=None):
    name = name or f"G_{user.id}"
    g, _ = UserGroup.objects.get_or_create(
        name=name, location=location,
        defaults={"created_by": user},
    )
    g.members.add(user)
    room.allowed_groups.add(g)
    return g


# ─── 1. Atomic Transactions ───────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestAtomicTransactions:

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_booking_creation_is_atomic(self, _layer, _async, auth_client, desk, room, location, user):
        """If broadcast fails after booking, entire transaction should roll back."""
        grant_access(user, room, location)

        # Simulate broadcast failure
        _async.side_effect = Exception("Channel layer unavailable")

        resp = auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(3)),
        }, format="json")

        # Booking should not exist since transaction rolled back
        assert resp.status_code == 500 or not Booking.objects.filter(desk=desk).exists()

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_desk_state_consistent_after_booking(self, _layer, _async, auth_client, desk, room, location, user):
        """Desk is_booked state must reflect active booking accurately."""
        grant_access(user, room, location)

        resp = auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(3)),
        }, format="json")
        assert resp.status_code == 201

        # Manually set booking to active (start in past)
        booking = Booking.objects.get(pk=resp.data["id"])
        Booking.objects.filter(pk=booking.pk).update(start_time=past(1))

        desk.refresh_from_db()
        desk.refresh_booking_state()
        desk.refresh_from_db()
        assert desk.is_booked is True
        assert desk.booked_by == user

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_desk_state_clears_after_booking_deleted(self, _layer, _async, auth_client, desk, room, location, user):
        """After cancelling active booking, desk should no longer be booked."""
        grant_access(user, room, location)
        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=past(1), end_time=future(2),
        )
        desk.refresh_booking_state()
        desk.refresh_from_db()
        assert desk.is_booked is True

        resp = auth_client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 204

        desk.refresh_from_db()
        assert desk.is_booked is False
        assert desk.booked_by is None

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_overlapping_booking_rolls_back_cleanly(self, _layer, _async, auth_client, auth_client2, desk, room, location, user, user2):
        """Failed booking attempt must leave no partial state."""
        grant_access(user, room, location)
        grant_access(user2, room, location)

        # First booking succeeds
        auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(5)),
        }, format="json")

        # Second booking overlaps — should fail cleanly
        resp = auth_client2.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(2)),
            "end_time": iso(future(4)),
        }, format="json")

        assert resp.status_code in (400, 409)
        # Only one booking should exist
        assert Booking.objects.filter(desk=desk).count() == 1


# ─── 2. Concurrency / Race Conditions ────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestConcurrency:

    def test_concurrent_bookings_only_one_succeeds(self, desk, room, location, user, user2):
        """
        Two users attempt to book the same desk at the same time.
        Only one should succeed due to select_for_update locking.
        """
        grant_access(user, room, location, name="G1")
        grant_access(user2, room, location, name="G2")

        results = []

        def book(u):
            from rest_framework.test import APIClient
            from rest_framework_simplejwt.tokens import RefreshToken

            client = APIClient()
            refresh = RefreshToken.for_user(u)
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

            resp = client.post("/api/bookings/", {
                "desk_id": desk.id,
                "start_time": iso(future(1)),
                "end_time": iso(future(3)),
            }, format="json")
            results.append(resp.status_code)

        t1 = threading.Thread(target=book, args=(user,))
        t2 = threading.Thread(target=book, args=(user2,))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Exactly one should succeed, one should fail
        success_count = results.count(201)
        fail_count = sum(1 for r in results if r in (400, 409))

        assert success_count == 1, f"Expected 1 success, got {success_count}. Results: {results}"
        assert fail_count == 1, f"Expected 1 failure, got {fail_count}. Results: {results}"
        assert Booking.objects.filter(desk=desk).count() == 1

    def test_concurrent_bulk_creates_no_double_booking(self, desk, room, location, user, user2):
        """
        Two users bulk-create bookings for the same slot.
        No double booking should result.
        """
        grant_access(user, room, location, name="G1")
        grant_access(user2, room, location, name="G2")

        results = []

        def bulk_book(u):
            from rest_framework.test import APIClient
            from rest_framework_simplejwt.tokens import RefreshToken

            client = APIClient()
            refresh = RefreshToken.for_user(u)
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

            resp = client.post("/api/bookings/bulk_create/", {
                "desk_id": desk.id,
                "atomic": True,
                "intervals": [
                    {"start_time": iso(future(1)), "end_time": iso(future(3))},
                ],
            }, format="json")
            results.append(resp.status_code)

        t1 = threading.Thread(target=bulk_book, args=(user,))
        t2 = threading.Thread(target=bulk_book, args=(user2,))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Only one booking in that slot
        assert Booking.objects.filter(
            desk=desk,
            start_time__lt=future(3),
            end_time__gt=future(1)
        ).count() == 1


# ─── 3. Booking Ownership ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBookingOwnership:

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_user_cannot_cancel_another_users_booking(self, _layer, _async, auth_client, desk, room, location, user, user2):
        """Regular user must receive 403 when trying to cancel another user's booking."""
        grant_access(user, room, location)
        grant_access(user2, room, location)

        booking = Booking.objects.create(
            user=user2, desk=desk,
            start_time=future(1), end_time=future(3),
        )

        resp = auth_client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 403
        assert Booking.objects.filter(pk=booking.id).exists()

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_user_can_cancel_own_booking(self, _layer, _async, auth_client, desk, room, location, user):
        """User should be able to cancel their own booking."""
        grant_access(user, room, location)
        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=future(1), end_time=future(3),
        )
        resp = auth_client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 204
        assert not Booking.objects.filter(pk=booking.id).exists()

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_superuser_can_cancel_any_booking(self, _layer, _async, admin_client, desk, user):
        """Superusers should be able to cancel any booking."""
        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=future(1), end_time=future(3),
        )
        resp = admin_client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 204

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_staff_can_cancel_any_booking(self, _layer, _async, desk, user, user2):
        """Staff users should also be able to cancel any booking."""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        user2.is_staff = True
        user2.save()

        client = APIClient()
        refresh = RefreshToken.for_user(user2)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=future(1), end_time=future(3),
        )
        resp = client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 204


# ─── 4. Task Transactions ─────────────────────────────────────────────────────

@pytest.mark.django_db(transaction=True)
class TestTaskTransactions:

    @patch("booking.tasks.async_to_sync")
    @patch("booking.tasks.get_channel_layer")
    def test_expire_and_activate_updates_desk_atomically(self, _layer, _async, desk, user):
        """expire_and_activate_bookings should update desk state under a transaction."""
        from booking.tasks import expire_and_activate_bookings

        # Create a booking that just started
        Booking.objects.create(
            user=user, desk=desk,
            start_time=past(0.5),
            end_time=future(2),
        )

        expire_and_activate_bookings()

        desk.refresh_from_db()
        assert desk.is_booked is True
        assert desk.booked_by == user

    @patch("booking.tasks.async_to_sync")
    @patch("booking.tasks.get_channel_layer")
    def test_expire_and_activate_clears_ended_booking(self, _layer, _async, desk, user):
        """expire_and_activate_bookings should clear desk state when booking ends."""
        from booking.tasks import expire_and_activate_bookings

        # Simulate a booking that just ended
        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=past(2),
            end_time=past(0.1),
        )
        desk.is_booked = True
        desk.booked_by = user
        desk.save()

        expire_and_activate_bookings()

        desk.refresh_from_db()
        assert desk.is_booked is False
        assert desk.booked_by is None

    @patch("booking.tasks.read_lock", return_value=None)
    @patch("booking.tasks.async_to_sync")
    @patch("booking.tasks.get_channel_layer")
    def test_startup_sync_clears_stale_lock(self, _layer, _async, _read_lock, desk, user):
        """startup_sync_desks should clear DB lock if Redis lock has expired."""
        from booking.tasks import startup_sync_desks

        desk.is_locked = True
        desk.locked_by = user
        desk.save()

        startup_sync_desks()

        desk.refresh_from_db()
        assert desk.is_locked is False
        assert desk.locked_by is None


# ─── 5. Past/Active Booking Deletion Guardrail ────────────────────────────────

@pytest.mark.django_db
class TestBookingDeletionGuardrail:

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_cannot_cancel_past_booking(self, _layer, _async, auth_client, desk, room, location, user):
        """User cannot cancel a booking that has already ended."""
        grant_access(user, room, location)
        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=past(3), end_time=past(1),
        )
        resp = auth_client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 403
        assert "past" in str(resp.data).lower()
        assert Booking.objects.filter(pk=booking.id).exists()

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_can_cancel_active_booking(self, _layer, _async, auth_client, desk, room, location, user):
        """User can cancel a booking that is currently active."""
        grant_access(user, room, location)
        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=past(1), end_time=future(2),
        )
        resp = auth_client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 204
        assert not Booking.objects.filter(pk=booking.id).exists()

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_can_cancel_future_booking(self, _layer, _async, auth_client, desk, room, location, user):
        """User can cancel a booking that hasn't started yet."""
        grant_access(user, room, location)
        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=future(1), end_time=future(3),
        )
        resp = auth_client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 204
        assert not Booking.objects.filter(pk=booking.id).exists()

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_staff_can_cancel_past_booking(self, _layer, _async, desk, user, user2):
        """Staff should be able to cancel past bookings."""
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        user2.is_staff = True
        user2.save()

        client = APIClient()
        refresh = RefreshToken.for_user(user2)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=past(3), end_time=past(1),
        )
        resp = client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 204

    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_superuser_can_cancel_active_booking(self, _layer, _async, admin_client, desk, user):
        """Superuser can cancel active bookings."""
        booking = Booking.objects.create(
            user=user, desk=desk,
            start_time=past(1), end_time=future(2),
        )
        resp = admin_client.delete(f"/api/bookings/{booking.id}/")
        assert resp.status_code == 204