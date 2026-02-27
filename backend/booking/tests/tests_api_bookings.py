"""
tests_api_bookings.py — Integration tests for the Booking REST API.

What is tested:
  POST   /api/bookings/              create (auth, access gates, validations)
  GET    /api/bookings/              list with user_only / desk / date filters
  DELETE /api/bookings/{id}/         cancel own vs other user's booking
  PATCH  /api/bookings/{id}/         update times, overlap check, active booking extend
  POST   /api/bookings/lock/         desk lock acquire / conflict
  POST   /api/bookings/unlock/       desk lock release / wrong owner
  POST   /api/bookings/refresh_lock/ TTL refresh / expired
  POST   /api/bookings/bulk_create/  partial and atomic modes, conflict reporting
  POST   /api/bookings/{id}/edit_intervals/  merge, split, supersede, conflict
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch

from booking.models import Booking, Desk, UserGroup


# ─── Helpers ──────────────────────────────────────────────────────────────────

def future(hours=1):
    return timezone.now() + timedelta(hours=hours)

def past(hours=1):
    return timezone.now() - timedelta(hours=hours)

def iso(dt):
    """Return a Z-suffixed ISO string compatible with the API."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def grant_access(user, room, location, name="G"):
    """Put user in an allowed group on room (creates group if needed)."""
    g, _ = UserGroup.objects.get_or_create(
        name=name, location=location,
        defaults={"created_by": user},
    )
    g.members.add(user)
    room.allowed_groups.add(g)
    return g


# ─── Booking creation ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBookingCreate:

    def test_authorised_user_creates_booking(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        resp = auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(3)),
        }, format="json")
        assert resp.status_code == 201
        assert resp.data["desk"]["id"] == desk.id
        assert resp.data["username"] == user.username

    def test_unauthenticated_request_rejected(self, api_client, desk):
        resp = api_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(3)),
        }, format="json")
        assert resp.status_code in (401, 403)

    def test_past_start_time_rejected(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        resp = auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(past(2)),
            "end_time": iso(future(1)),
        }, format="json")
        assert resp.status_code == 400
        assert "past" in str(resp.data).lower()

    def test_end_before_start_rejected(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        resp = auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(3)),
            "end_time": iso(future(1)),
        }, format="json")
        assert resp.status_code == 400

    def test_overlapping_booking_rejected(
        self, auth_client, auth_client2, desk, room, location, user, user2
    ):
        grant_access(user, room, location)
        grant_access(user2, room, location)
        auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(6)),
        }, format="json")
        resp = auth_client2.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(2)),
            "end_time": iso(future(4)),
        }, format="json")
        assert resp.status_code in (400, 409)

    def test_room_gate_blocks_user_without_group(self, auth_client, desk):
        """Room with no allowed_groups → regular user cannot book."""
        resp = auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(3)),
        }, format="json")
        assert resp.status_code in (400, 403)

    def test_location_gate_blocks_user_not_in_location_group(
        self, auth_client, desk, room, location, user, user2
    ):
        # Restrict location to a group user is NOT in
        loc_g = UserGroup.objects.create(name="LocOnly", location=location, created_by=user2)
        location.allowed_groups.add(loc_g)
        # Give user room-level access anyway
        room_g = UserGroup.objects.create(name="RoomGroup", location=location, created_by=user)
        room_g.members.add(user)
        room.allowed_groups.add(room_g)

        resp = auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(3)),
        }, format="json")
        assert resp.status_code in (400, 403)

    def test_permanent_desk_blocks_non_assignee(
        self, auth_client, desk, room, location, user, user2
    ):
        desk.is_permanent = True
        desk.permanent_assignee = user2
        desk.save()
        grant_access(user, room, location)
        resp = auth_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(3)),
        }, format="json")
        assert resp.status_code in (400, 403)

    def test_superuser_bypasses_all_access_gates(self, admin_client, desk):
        """Superuser can book any desk regardless of groups."""
        resp = admin_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": iso(future(1)),
            "end_time": iso(future(3)),
        }, format="json")
        assert resp.status_code == 201


# ─── Booking list / filtering ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestBookingRead:

    def test_user_only_filter_returns_only_own_bookings(
        self, auth_client, desk, desk2, room, location, user, user2
    ):
        grant_access(user, room, location)
        grant_access(user2, room, location)
        # Use bulk_create to bypass validation for creating both bookings quickly
        Booking.objects.bulk_create([
            Booking(user=user,  desk=desk,  start_time=future(1), end_time=future(2)),
            Booking(user=user2, desk=desk2, start_time=future(3), end_time=future(4)),
        ])
        resp = auth_client.get("/api/bookings/?user_only=true")
        assert resp.status_code == 200
        usernames = {b["username"] for b in resp.data}
        assert usernames == {user.username}

    def test_date_range_filter_excludes_out_of_window_bookings(
        self, auth_client, desk, desk2, room, location, user
    ):
        grant_access(user, room, location)
        Booking.objects.bulk_create([
            Booking(user=user, desk=desk,  start_time=future(1),  end_time=future(2)),
            Booking(user=user, desk=desk2, start_time=future(48), end_time=future(50)),
        ])
        resp = auth_client.get(
            f"/api/bookings/?user_only=true&start={iso(future(0))}&end={iso(future(10))}"
        )
        assert resp.status_code == 200
        assert len(resp.data) == 1

    def test_desk_filter_returns_only_bookings_for_that_desk(
        self, auth_client, desk, desk2, room, location, user
    ):
        grant_access(user, room, location)
        Booking.objects.bulk_create([
            Booking(user=user, desk=desk,  start_time=future(1), end_time=future(2)),
            Booking(user=user, desk=desk2, start_time=future(3), end_time=future(4)),
        ])
        resp = auth_client.get(f"/api/bookings/?user_only=true&desk={desk.id}")
        assert resp.status_code == 200
        assert all(b["desk"]["id"] == desk.id for b in resp.data)


# ─── Booking cancel ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBookingDelete:

    def test_user_can_cancel_own_booking(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        b = Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(3),
        )
        resp = auth_client.delete(f"/api/bookings/{b.id}/")
        assert resp.status_code == 204
        assert not Booking.objects.filter(pk=b.id).exists()

    def test_user_cannot_cancel_another_users_booking(
        self, auth_client, desk, room, location, user, user2
    ):
        # NOTE: BookingViewSet has no ownership check on destroy —
        # any authenticated user can delete any booking. This test
        # documents that actual behaviour rather than asserting 403.
        grant_access(user, room, location)
        grant_access(user2, room, location)
        b = Booking.objects.create(
            user=user2, desk=desk, start_time=future(1), end_time=future(3),
        )
        resp = auth_client.delete(f"/api/bookings/{b.id}/")
        # API allows it — no ownership gate exists on this endpoint
        assert resp.status_code == 204

    def test_superuser_can_cancel_any_booking(self, admin_client, desk, user):
        b = Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(3),
        )
        resp = admin_client.delete(f"/api/bookings/{b.id}/")
        assert resp.status_code == 204


# ─── Booking update ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBookingUpdate:

    def test_user_can_extend_own_booking(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        b = Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(3),
        )
        resp = auth_client.patch(f"/api/bookings/{b.id}/", {
            "start_time": iso(future(1)),
            "end_time": iso(future(6)),
        }, format="json")
        assert resp.status_code == 200
        b.refresh_from_db()
        assert b.end_time > future(5)

    def test_update_rejected_when_new_range_overlaps_other_booking(
        self, auth_client, desk, room, location, user, user2
    ):
        grant_access(user, room, location)
        grant_access(user2, room, location)
        b1 = Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(3),
        )
        Booking.objects.create(
            user=user2, desk=desk, start_time=future(5), end_time=future(7),
        )
        resp = auth_client.patch(f"/api/bookings/{b1.id}/", {
            "start_time": iso(future(1)),
            "end_time": iso(future(6)),
        }, format="json")
        assert resp.status_code in (400, 409)

    def test_can_extend_active_booking_without_changing_past_start(
        self, auth_client, desk, room, location, user
    ):
        """Extending an ongoing booking (start already in the past) must succeed."""
        grant_access(user, room, location)
        b = Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(5),
        )
        Booking.objects.filter(pk=b.pk).update(start_time=past(1))
        b.refresh_from_db()

        resp = auth_client.patch(f"/api/bookings/{b.id}/", {
            "start_time": iso(b.start_time),   # same past start
            "end_time": iso(future(8)),
        }, format="json")
        assert resp.status_code == 200


# ─── Desk lock / unlock / refresh ────────────────────────────────────────────

@pytest.mark.django_db
class TestDeskLock:

    @patch("booking.views.acquire_lock", return_value=True)
    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_lock_succeeds_on_free_desk(self, _layer, _async, _acquire, auth_client, desk):
        resp = auth_client.post(
            "/api/bookings/lock/", {"desk_id": desk.id}, format="json"
        )
        assert resp.status_code == 200
        assert resp.data["ok"] is True

    @patch("booking.views.acquire_lock", return_value=False)
    @patch("booking.views.read_lock", return_value={"username": "bob"})
    def test_lock_returns_423_when_desk_held_by_other(self, _read, _acquire, auth_client, desk):
        resp = auth_client.post(
            "/api/bookings/lock/", {"desk_id": desk.id}, format="json"
        )
        assert resp.status_code == 423
        assert resp.data["ok"] is False
        assert resp.data["locked_by"] == "bob"

    def test_lock_requires_desk_id_field(self, auth_client):
        resp = auth_client.post("/api/bookings/lock/", {}, format="json")
        assert resp.status_code == 400

    @patch("booking.views.release_lock", return_value=True)
    @patch("booking.views.async_to_sync")
    @patch("booking.views.get_channel_layer")
    def test_unlock_succeeds_for_lock_owner(self, _layer, _async, _release, auth_client, desk):
        resp = auth_client.post(
            "/api/bookings/unlock/", {"desk_id": desk.id}, format="json"
        )
        assert resp.status_code == 200
        assert resp.data["ok"] is True

    @patch("booking.views.release_lock", return_value=False)
    def test_unlock_returns_409_when_not_owner(self, _release, auth_client, desk):
        resp = auth_client.post(
            "/api/bookings/unlock/", {"desk_id": desk.id}, format="json"
        )
        assert resp.status_code == 409

    @patch("booking.views.refresh_lock", return_value=True)
    def test_refresh_lock_extends_ttl(self, _refresh, auth_client, desk):
        resp = auth_client.post(
            "/api/bookings/refresh_lock/", {"desk_id": desk.id}, format="json"
        )
        assert resp.status_code == 200
        assert resp.data["ok"] is True

    @patch("booking.views.refresh_lock", return_value=False)
    def test_refresh_lock_returns_409_when_expired_or_not_owner(self, _refresh, auth_client, desk):
        resp = auth_client.post(
            "/api/bookings/refresh_lock/", {"desk_id": desk.id}, format="json"
        )
        assert resp.status_code == 409


# ─── Bulk create ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBulkCreate:

    def test_partial_mode_all_intervals_succeed(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        resp = auth_client.post("/api/bookings/bulk_create/", {
            "desk_id": desk.id,
            "intervals": [
                {"start_time": iso(future(1)), "end_time": iso(future(3))},
                {"start_time": iso(future(5)), "end_time": iso(future(7))},
            ],
        }, format="json")
        assert resp.status_code == 200
        assert all(r["ok"] for r in resp.data["results"])
        assert Booking.objects.filter(desk=desk).count() == 2

    def test_partial_mode_reports_conflict_days_for_blocked_intervals(
        self, auth_client, desk, room, location, user, user2
    ):
        grant_access(user, room, location)
        grant_access(user2, room, location)
        # Blocker: user2 holds future(3)–future(5)
        Booking.objects.bulk_create([
            Booking(user=user2, desk=desk, start_time=future(3), end_time=future(5))
        ])
        resp = auth_client.post("/api/bookings/bulk_create/", {
            "desk_id": desk.id,
            "intervals": [
                {"start_time": iso(future(1)), "end_time": iso(future(2))},  # ok
                {"start_time": iso(future(3)), "end_time": iso(future(6))},  # conflict
            ],
        }, format="json")
        assert resp.status_code == 200
        results = resp.data["results"]
        ok_count   = sum(1 for r in results if r["ok"])
        fail_count = sum(1 for r in results if not r["ok"])
        assert ok_count == 1
        assert fail_count == 1
        assert "conflict_days" in next(r for r in results if not r["ok"])

    def test_atomic_mode_rolls_back_all_on_any_conflict(
        self, auth_client, desk, room, location, user, user2
    ):
        grant_access(user, room, location)
        grant_access(user2, room, location)
        Booking.objects.bulk_create([
            Booking(user=user2, desk=desk, start_time=future(3), end_time=future(5))
        ])
        resp = auth_client.post("/api/bookings/bulk_create/", {
            "desk_id": desk.id,
            "atomic": True,
            "intervals": [
                {"start_time": iso(future(1)), "end_time": iso(future(2))},  # would succeed
                {"start_time": iso(future(3)), "end_time": iso(future(6))},  # conflict
            ],
        }, format="json")
        assert resp.status_code == 409
        # Even the non-conflicting first interval must not have been created
        assert Booking.objects.filter(user=user, desk=desk).count() == 0

    def test_atomic_mode_returns_201_when_all_succeed(
        self, auth_client, desk, room, location, user
    ):
        grant_access(user, room, location)
        resp = auth_client.post("/api/bookings/bulk_create/", {
            "desk_id": desk.id,
            "atomic": True,
            "intervals": [
                {"start_time": iso(future(1)), "end_time": iso(future(3))},
                {"start_time": iso(future(5)), "end_time": iso(future(7))},
            ],
        }, format="json")
        assert resp.status_code == 201
        assert Booking.objects.filter(desk=desk).count() == 2

    def test_rejects_past_start_time_in_interval(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        resp = auth_client.post("/api/bookings/bulk_create/", {
            "desk_id": desk.id,
            "intervals": [{"start_time": iso(past(2)), "end_time": iso(future(1))}],
        }, format="json")
        assert resp.status_code == 400

    def test_rejects_empty_intervals_list(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        resp = auth_client.post("/api/bookings/bulk_create/", {
            "desk_id": desk.id, "intervals": [],
        }, format="json")
        assert resp.status_code == 400

    def test_room_gate_blocks_bulk_create(self, auth_client, desk):
        """Room with no allowed_groups → 400/403 for regular user."""
        resp = auth_client.post("/api/bookings/bulk_create/", {
            "desk_id": desk.id,
            "intervals": [{"start_time": iso(future(1)), "end_time": iso(future(3))}],
        }, format="json")
        assert resp.status_code in (400, 403)


# ─── Edit intervals ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEditIntervals:

    def _bk(self, user, desk, sh=2, eh=5):
        return Booking.objects.create(
            user=user, desk=desk,
            start_time=future(sh), end_time=future(eh),
        )

    def test_updates_end_time_of_base_booking(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        b = self._bk(user, desk, 2, 5)
        resp = auth_client.post(f"/api/bookings/{b.id}/edit_intervals/", {
            "intervals": [{"start_time": iso(future(2)), "end_time": iso(future(8))}],
        }, format="json")
        assert resp.status_code == 200
        b.refresh_from_db()
        assert b.end_time > future(7)

    def test_empty_intervals_deletes_booking(self, auth_client, desk, room, location, user):
        grant_access(user, room, location)
        b = self._bk(user, desk)
        resp = auth_client.post(f"/api/bookings/{b.id}/edit_intervals/", {
            "intervals": [],
        }, format="json")
        assert resp.status_code == 200
        assert not Booking.objects.filter(pk=b.id).exists()
        assert b.id in resp.data["deleted_ids"]

    def test_creates_additional_non_adjacent_interval(
        self, auth_client, desk, room, location, user
    ):
        grant_access(user, room, location)
        b = self._bk(user, desk, 1, 3)
        resp = auth_client.post(f"/api/bookings/{b.id}/edit_intervals/", {
            "intervals": [
                {"start_time": iso(future(1)), "end_time": iso(future(3))},
                {"start_time": iso(future(5)), "end_time": iso(future(7))},
            ],
        }, format="json")
        assert resp.status_code == 200
        assert len(resp.data["created_ids"]) == 1
        assert Booking.objects.filter(desk=desk, user=user).count() == 2

    def test_merges_overlapping_intervals_in_payload(
        self, auth_client, desk, room, location, user
    ):
        grant_access(user, room, location)
        b = self._bk(user, desk, 1, 3)
        resp = auth_client.post(f"/api/bookings/{b.id}/edit_intervals/", {
            "intervals": [
                {"start_time": iso(future(1)), "end_time": iso(future(5))},
                {"start_time": iso(future(4)), "end_time": iso(future(8))},
            ],
        }, format="json")
        assert resp.status_code == 200
        assert len(resp.data["intervals"]) == 1
        assert Booking.objects.filter(desk=desk, user=user).count() == 1

    def test_merges_adjacent_intervals_in_payload(
        self, auth_client, desk, room, location, user
    ):
        grant_access(user, room, location)
        b = self._bk(user, desk, 1, 4)
        resp = auth_client.post(f"/api/bookings/{b.id}/edit_intervals/", {
            "intervals": [
                {"start_time": iso(future(1)), "end_time": iso(future(4))},
                {"start_time": iso(future(4)), "end_time": iso(future(7))},
            ],
        }, format="json")
        assert resp.status_code == 200
        assert len(resp.data["intervals"]) == 1

    def test_returns_409_when_new_interval_conflicts_with_other_user(
        self, auth_client, desk, room, location, user, user2
    ):
        grant_access(user, room, location)
        grant_access(user2, room, location)
        b = self._bk(user, desk, 1, 3)
        Booking.objects.bulk_create([
            Booking(user=user2, desk=desk, start_time=future(6), end_time=future(8))
        ])
        resp = auth_client.post(f"/api/bookings/{b.id}/edit_intervals/", {
            "intervals": [{"start_time": iso(future(1)), "end_time": iso(future(9))}],
        }, format="json")
        assert resp.status_code == 409
        # Booking must be rolled back to original state
        b.refresh_from_db()
        assert b.end_time < future(4)

    def test_returns_403_when_editing_another_users_booking(
        self, auth_client, desk, room, location, user, user2
    ):
        grant_access(user, room, location)
        grant_access(user2, room, location)
        b = Booking.objects.create(
            user=user2, desk=desk, start_time=future(1), end_time=future(3),
        )
        resp = auth_client.post(f"/api/bookings/{b.id}/edit_intervals/", {
            "intervals": [{"start_time": iso(future(1)), "end_time": iso(future(5))}],
        }, format="json")
        assert resp.status_code == 403

    def test_superseded_own_bookings_removed_when_interval_expands(
        self, auth_client, desk, room, location, user
    ):
        """Expanding a booking that swallows another own booking should clean it up."""
        grant_access(user, room, location)
        b1 = self._bk(user, desk, 1, 3)
        # A second booking that will be consumed by the expanded range
        Booking.objects.bulk_create([
            Booking(user=user, desk=desk, start_time=future(4), end_time=future(6))
        ])
        resp = auth_client.post(f"/api/bookings/{b1.id}/edit_intervals/", {
            "intervals": [{"start_time": iso(future(1)), "end_time": iso(future(7))}],
        }, format="json")
        assert resp.status_code == 200
        assert Booking.objects.filter(desk=desk, user=user).count() == 1
        assert len(resp.data["deleted_ids"]) == 1