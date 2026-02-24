"""
tests_models.py — Unit tests for booking model validation and access-control methods.

What is tested:
  Booking.clean() / save()
    - past start_time rejected on new bookings
    - end_time <= start_time rejected
    - overlapping bookings rejected (all overlap patterns)
    - adjacent bookings allowed
    - updating active booking: unchanged past start is allowed, moved past start rejected
    - permanent desk enforcement at model level

  Desk model
    - is_permanent / permanent_assignee invariants (full_clean)
    - refresh_booking_state correctness

  Location.can_user_access()
    - open location (no allowed_groups) passes all
    - restricted location: non-member blocked, member allowed
    - manager / superuser / staff always pass

  Room.can_user_book()
    - no allowed_groups = nobody books
    - group member can book
    - non-member cannot book
    - room manager / location manager / superuser bypass gate
    - location gate blocks even when user is in room group
"""
import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

from booking.models import Country, Location, Floor, Room, Desk, Booking, UserGroup


def future(hours=1):
    return timezone.now() + timedelta(hours=hours)

def past(hours=1):
    return timezone.now() - timedelta(hours=hours)


# ─── Booking.clean() / save() ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestBookingValidation:

    def test_valid_future_booking_is_created(self, desk, user):
        b = Booking.objects.create(
            user=user, desk=desk,
            start_time=future(1), end_time=future(3),
        )
        assert b.pk is not None
        assert str(b) == f"{desk.name} booked by {user.username}"

    # ── Past / reversed times ─────────────────────────────────────────────────

    def test_new_booking_rejects_past_start_time(self, desk, user):
        with pytest.raises(ValidationError, match="start_time"):
            Booking.objects.create(
                user=user, desk=desk,
                start_time=past(2), end_time=future(1),
            )

    def test_rejects_end_time_before_start_time(self, desk, user):
        with pytest.raises(ValidationError, match="end_time"):
            Booking.objects.create(
                user=user, desk=desk,
                start_time=future(3), end_time=future(1),
            )

    def test_rejects_equal_start_and_end_time(self, desk, user):
        t = future(2)
        with pytest.raises(ValidationError, match="end_time"):
            Booking.objects.create(user=user, desk=desk, start_time=t, end_time=t)

    # ── Overlap patterns ──────────────────────────────────────────────────────

    def test_rejects_fully_contained_overlap(self, desk, user, user2):
        Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(10),
        )
        with pytest.raises(ValidationError, match="already booked"):
            Booking.objects.create(
                user=user2, desk=desk, start_time=future(3), end_time=future(7),
            )

    def test_rejects_partial_overlap_leading_edge(self, desk, user, user2):
        Booking.objects.create(
            user=user, desk=desk, start_time=future(3), end_time=future(6),
        )
        with pytest.raises(ValidationError):
            Booking.objects.create(
                user=user2, desk=desk, start_time=future(1), end_time=future(4),
            )

    def test_rejects_partial_overlap_trailing_edge(self, desk, user, user2):
        Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(4),
        )
        with pytest.raises(ValidationError):
            Booking.objects.create(
                user=user2, desk=desk, start_time=future(3), end_time=future(6),
            )

    def test_rejects_wrapping_overlap(self, desk, user, user2):
        Booking.objects.create(
            user=user, desk=desk, start_time=future(2), end_time=future(4),
        )
        with pytest.raises(ValidationError):
            Booking.objects.create(
                user=user2, desk=desk, start_time=future(1), end_time=future(6),
            )

    # ── Non-overlapping allowed ───────────────────────────────────────────────

    def test_adjacent_booking_is_allowed(self, desk, user, user2):
        """Booking starting exactly when another ends should succeed."""
        Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(3),
        )
        b = Booking.objects.create(
            user=user2, desk=desk, start_time=future(3), end_time=future(5),
        )
        assert b.pk is not None

    def test_sequential_bookings_by_same_user_on_same_desk(self, desk, user):
        Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(3),
        )
        b = Booking.objects.create(
            user=user, desk=desk, start_time=future(4), end_time=future(6),
        )
        assert b.pk is not None

    def test_same_time_on_different_desks_is_allowed(self, desk, desk2, user):
        Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(3),
        )
        b = Booking.objects.create(
            user=user, desk=desk2, start_time=future(1), end_time=future(3),
        )
        assert b.pk is not None

    # ── Update / extend active bookings ──────────────────────────────────────

    def test_extending_active_booking_keeps_unchanged_past_start(self, desk, user):
        """
        A booking that has already started (start_time in past) can be saved
        again with the *same* start_time – only end_time changes.
        """
        b = Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(5),
        )
        # Simulate booking going active: move start to the past via queryset update
        # (bypasses full_clean so we can set a past time on an existing record)
        Booking.objects.filter(pk=b.pk).update(start_time=past(1))
        b.refresh_from_db()

        # Now extend end_time — start is unchanged so it must be allowed
        b.end_time = future(8)
        b.save()  # must not raise
        b.refresh_from_db()
        assert b.end_time > future(7)

    def test_moving_start_of_active_booking_to_new_past_time_is_rejected(self, desk, user):
        b = Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(5),
        )
        Booking.objects.filter(pk=b.pk).update(start_time=past(1))
        b.refresh_from_db()
        b.start_time = past(3)  # different past time — should be rejected
        with pytest.raises(ValidationError, match="start_time"):
            b.save()

    # ── Permanent desk ────────────────────────────────────────────────────────

    def test_permanent_desk_rejects_booking_by_non_assignee(self, desk, user, user2):
        desk.is_permanent = True
        desk.permanent_assignee = user
        desk.save()
        with pytest.raises(ValidationError):
            Booking.objects.create(
                user=user2, desk=desk, start_time=future(1), end_time=future(3),
            )

    def test_permanent_desk_allows_booking_by_assignee(self, desk, user):
        desk.is_permanent = True
        desk.permanent_assignee = user
        desk.save()
        b = Booking.objects.create(
            user=user, desk=desk, start_time=future(1), end_time=future(3),
        )
        assert b.pk is not None


# ─── Desk model ───────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeskModel:

    def test_permanent_desk_without_assignee_fails_full_clean(self, desk):
        desk.is_permanent = True
        with pytest.raises(ValidationError, match="permanent_assignee"):
            desk.full_clean()

    def test_non_permanent_desk_with_assignee_fails_full_clean(self, desk, user):
        desk.is_permanent = False
        desk.permanent_assignee = user
        with pytest.raises(ValidationError, match="permanent_assignee"):
            desk.full_clean()

    def test_refresh_booking_state_with_no_bookings(self, desk):
        desk.refresh_booking_state()
        assert desk.is_booked is False
        assert desk.booked_by is None

    def test_refresh_booking_state_marks_booked_for_active_booking(self, desk, user):
        # Use bulk_create to bypass validation — this booking started in the past
        Booking.objects.bulk_create([
            Booking(user=user, desk=desk, start_time=past(1), end_time=future(2))
        ])
        desk.refresh_booking_state()
        assert desk.is_booked is True
        assert desk.booked_by == user

    def test_refresh_booking_state_clears_booked_after_booking_ends(self, desk, user):
        # Expired booking; desk incorrectly flagged as booked
        Booking.objects.bulk_create([
            Booking(user=user, desk=desk, start_time=past(3), end_time=past(1))
        ])
        Desk.objects.filter(pk=desk.pk).update(is_booked=True, booked_by=user)
        desk.refresh_from_db()

        desk.refresh_booking_state()
        assert desk.is_booked is False
        assert desk.booked_by is None

    def test_desk_str_with_permanent_assignee(self, desk, user):
        desk.is_permanent = True
        desk.permanent_assignee = user
        desk.save()
        assert user.username in str(desk)
        assert "Permanent" in str(desk)


# ─── Location access control ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestLocationAccessControl:

    def test_open_location_allows_any_authenticated_user(self, location, user):
        assert location.can_user_access(user) is True

    def test_restricted_location_blocks_non_member(self, location, user, user2):
        g = UserGroup.objects.create(name="VIP", location=location, created_by=user)
        location.allowed_groups.add(g)
        assert location.can_user_access(user2) is False

    def test_restricted_location_allows_group_member(self, location, user, user2):
        g = UserGroup.objects.create(name="VIP", location=location, created_by=user)
        g.members.add(user2)
        location.allowed_groups.add(g)
        assert location.can_user_access(user2) is True

    def test_location_manager_bypasses_restricted_gate(self, location, user, user2):
        g = UserGroup.objects.create(name="VIP", location=location, created_by=user)
        location.allowed_groups.add(g)
        location.location_managers.add(user2)
        assert location.can_user_access(user2) is True

    def test_superuser_bypasses_restricted_gate(self, location, superuser, user):
        g = UserGroup.objects.create(name="VIP", location=location, created_by=user)
        location.allowed_groups.add(g)
        assert location.can_user_access(superuser) is True

    def test_staff_user_bypasses_restricted_gate(self, location, user):
        user.is_staff = True
        user.save()
        g = UserGroup.objects.create(name="VIP", location=location, created_by=user)
        location.allowed_groups.add(g)
        assert location.can_user_access(user) is True

    def test_user_in_multiple_groups_only_needs_one(self, location, user):
        """User only needs membership in one of the allowed groups."""
        g1 = UserGroup.objects.create(name="G1", location=location, created_by=user)
        g2 = UserGroup.objects.create(name="G2", location=location, created_by=user)
        g2.members.add(user)
        location.allowed_groups.add(g1, g2)
        assert location.can_user_access(user) is True


# ─── Room access control ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRoomAccessControl:

    def test_room_with_no_allowed_groups_blocks_regular_user(self, room, user):
        """Empty allowed_groups = nobody but managers can book."""
        assert room.can_user_book(user) is False

    def test_group_member_can_book(self, room, location, user):
        g = UserGroup.objects.create(name="Devs", location=location, created_by=user)
        g.members.add(user)
        room.allowed_groups.add(g)
        assert room.can_user_book(user) is True

    def test_non_member_cannot_book(self, room, location, user, user2):
        g = UserGroup.objects.create(name="Devs", location=location, created_by=user)
        g.members.add(user)
        room.allowed_groups.add(g)
        assert room.can_user_book(user2) is False

    def test_room_manager_bypasses_gate(self, room, user2):
        room.room_managers.add(user2)
        assert room.can_user_book(user2) is True

    def test_location_manager_bypasses_gate(self, room, location, user2):
        location.location_managers.add(user2)
        assert room.can_user_book(user2) is True

    def test_superuser_bypasses_gate(self, room, superuser):
        assert room.can_user_book(superuser) is True

    def test_location_gate_blocks_user_even_if_in_room_group(self, room, location, user):
        """
        Two-layer gate: if location gate fails, room group membership is irrelevant.
        """
        # Restrict location to a group user is NOT in
        loc_g = UserGroup.objects.create(name="LocOnly", location=location, created_by=user)
        location.allowed_groups.add(loc_g)

        # Give user access to the room via its own group
        room_g = UserGroup.objects.create(name="RoomGroup", location=location, created_by=user)
        room_g.members.add(user)
        room.allowed_groups.add(room_g)

        assert room.can_user_book(user) is False

    def test_user_passing_both_gates_can_book(self, room, location, user):
        loc_g = UserGroup.objects.create(name="LocGroup", location=location, created_by=user)
        loc_g.members.add(user)
        location.allowed_groups.add(loc_g)

        room_g = UserGroup.objects.create(name="RoomGroup", location=location, created_by=user)
        room_g.members.add(user)
        room.allowed_groups.add(room_g)

        assert room.can_user_book(user) is True