"""
tests_tasks_and_locks.py — Unit tests for the Redis desk-lock service and Celery tasks.

What is tested:
  desk_lock service
    acquire_lock  — free desk succeeds, different owner fails, same owner refreshes TTL
    release_lock  — owner succeeds, non-owner refused, no lock returns True
    read_lock     — returns None when free, returns parsed payload when locked
    refresh_lock  — wrong owner fails, exceeded LOCK_MAX_MS deletes key, owner succeeds

  Celery tasks
    expire_and_activate_bookings
      — marks desk not-booked after booking ends
      — marks desk booked when booking starts
      — clears stale DB lock flag when Redis key is gone
      — preserves DB lock flag when Redis key still exists
    startup_sync_desks
      — sets is_booked for active bookings on startup
      — clears stale is_booked flag when no active booking
      — clears stale lock flag when Redis key is absent
    cleanup_expired_tokens — smoke test (no tokens → completes cleanly)

Design notes:
  - All Redis interactions are mocked via unittest.mock.patch so no real Redis is needed.
  - Channel layer broadcasts are also mocked to avoid network requirements.
  - Bookings with past start_times are created via Booking.objects.bulk_create() to
    bypass the full_clean() validation that Booking.save() enforces.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone as dt_tz, timedelta
from django.utils import timezone

from booking.models import Desk, Booking
from booking.services.desk_lock import (
    acquire_lock, refresh_lock, release_lock, read_lock, LOCK_MAX_MS,
)


def future(hours=1):
    return timezone.now() + timedelta(hours=hours)

def past(hours=1):
    return timezone.now() - timedelta(hours=hours)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _payload(user_id, username, desk_id=1, issued_ago_minutes=0):
    """Build a JSON-encoded lock payload as bytes, as Redis would return it."""
    issued_at = (datetime.now(dt_tz.utc) - timedelta(minutes=issued_ago_minutes)).isoformat()
    return json.dumps({
        "user_id": user_id,
        "username": username,
        "issued_at": issued_at,
        "desk_id": desk_id,
    }).encode()


def _bk(user, desk, start, end):
    """Create a Booking bypassing full_clean() (allows past start_time)."""
    Booking.objects.bulk_create([
        Booking(user=user, desk=desk, start_time=start, end_time=end)
    ])
    return Booking.objects.filter(user=user, desk=desk, start_time=start).first()


# ─── desk_lock service ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeskLockService:

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_acquire_succeeds_when_desk_is_free(self, mock_redis, user):
        conn = MagicMock()
        conn.set.return_value = True     # NX=True succeeded → key was vacant
        mock_redis.return_value = conn
        assert acquire_lock(1, user.id, user.username) is True

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_acquire_fails_when_held_by_different_user(self, mock_redis, user, user2):
        conn = MagicMock()
        conn.set.return_value = False    # NX failed → key exists
        conn.get.return_value = _payload(user2.id, user2.username)
        mock_redis.return_value = conn
        assert acquire_lock(1, user.id, user.username) is False

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_acquire_refreshes_ttl_for_same_owner(self, mock_redis, user):
        conn = MagicMock()
        conn.set.return_value = False    # NX failed
        conn.get.return_value = _payload(user.id, user.username)   # same owner
        mock_redis.return_value = conn
        assert acquire_lock(1, user.id, user.username) is True
        conn.psetex.assert_called_once()  # TTL refresh path, not a new SET

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_release_succeeds_for_owner(self, mock_redis, user):
        conn = MagicMock()
        conn.get.return_value = _payload(user.id, user.username)
        mock_redis.return_value = conn
        assert release_lock(1, user.id) is True
        conn.delete.assert_called_once()

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_release_refused_for_non_owner(self, mock_redis, user, user2):
        conn = MagicMock()
        conn.get.return_value = _payload(user2.id, user2.username)
        mock_redis.return_value = conn
        assert release_lock(1, user.id) is False
        conn.delete.assert_not_called()

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_release_returns_true_when_no_lock_exists(self, mock_redis, user):
        conn = MagicMock()
        conn.get.return_value = None
        mock_redis.return_value = conn
        assert release_lock(1, user.id) is True

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_read_lock_returns_none_when_no_key(self, mock_redis):
        conn = MagicMock()
        conn.get.return_value = None
        mock_redis.return_value = conn
        assert read_lock(42) is None

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_read_lock_returns_parsed_dict(self, mock_redis, user):
        conn = MagicMock()
        conn.get.return_value = _payload(user.id, user.username)
        mock_redis.return_value = conn
        data = read_lock(1)
        assert data["user_id"] == user.id
        assert data["username"] == user.username

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_refresh_fails_for_non_owner(self, mock_redis, user, user2):
        conn = MagicMock()
        conn.get.return_value = _payload(user2.id, user2.username)
        mock_redis.return_value = conn
        assert refresh_lock(1, user.id) is False
        conn.psetex.assert_not_called()

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_refresh_deletes_key_and_returns_false_when_max_exceeded(self, mock_redis, user):
        """A lock held longer than LOCK_MAX_MS must be evicted."""
        max_minutes = LOCK_MAX_MS // 60_000
        conn = MagicMock()
        conn.get.return_value = _payload(user.id, user.username, issued_ago_minutes=max_minutes + 2)
        mock_redis.return_value = conn
        assert refresh_lock(1, user.id) is False
        conn.delete.assert_called_once()

    @patch("booking.services.desk_lock.get_redis_connection")
    def test_refresh_succeeds_for_owner_within_max(self, mock_redis, user):
        conn = MagicMock()
        conn.get.return_value = _payload(user.id, user.username, issued_ago_minutes=1)
        mock_redis.return_value = conn
        assert refresh_lock(1, user.id) is True
        conn.psetex.assert_called_once()


# ─── expire_and_activate_bookings ────────────────────────────────────────────

@pytest.mark.django_db
class TestExpireAndActivateBookings:

    def test_desk_cleared_after_booking_ends(self, desk, user):
        _bk(user, desk, past(2), past(0.1))
        Desk.objects.filter(pk=desk.pk).update(is_booked=True, booked_by=user)

        with patch("booking.tasks.get_channel_layer"), \
             patch("booking.tasks.async_to_sync"):
            from booking.tasks import expire_and_activate_bookings
            expire_and_activate_bookings()

        desk.refresh_from_db()
        assert desk.is_booked is False
        assert desk.booked_by is None

    def test_desk_marked_booked_when_booking_starts(self, desk, user):
        _bk(user, desk, past(0.1), future(3))

        with patch("booking.tasks.get_channel_layer"), \
             patch("booking.tasks.async_to_sync"):
            from booking.tasks import expire_and_activate_bookings
            expire_and_activate_bookings()

        desk.refresh_from_db()
        assert desk.is_booked is True
        assert desk.booked_by == user

    @patch("booking.tasks.read_lock", return_value=None)
    def test_stale_db_lock_cleared_when_redis_key_gone(self, _read, desk, user):
        Desk.objects.filter(pk=desk.pk).update(is_locked=True, locked_by=user)

        with patch("booking.tasks.get_channel_layer"), \
             patch("booking.tasks.async_to_sync"):
            from booking.tasks import expire_and_activate_bookings
            expire_and_activate_bookings()

        desk.refresh_from_db()
        assert desk.is_locked is False
        assert desk.locked_by is None

    @patch("booking.tasks.read_lock")
    def test_db_lock_preserved_when_redis_key_exists(self, mock_read, desk, user):
        mock_read.return_value = {"user_id": user.id, "username": user.username}
        Desk.objects.filter(pk=desk.pk).update(is_locked=True, locked_by=user)

        with patch("booking.tasks.get_channel_layer"), \
             patch("booking.tasks.async_to_sync"):
            from booking.tasks import expire_and_activate_bookings
            expire_and_activate_bookings()

        desk.refresh_from_db()
        assert desk.is_locked is True


# ─── startup_sync_desks ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestStartupSyncDesks:

    def test_active_booking_sets_desk_as_booked(self, desk, user):
        _bk(user, desk, past(1), future(3))
        Desk.objects.filter(pk=desk.pk).update(is_booked=False)

        with patch("booking.tasks.get_channel_layer"), \
             patch("booking.tasks.async_to_sync"):
            from booking.tasks import startup_sync_desks
            startup_sync_desks()

        desk.refresh_from_db()
        assert desk.is_booked is True
        assert desk.booked_by == user

    def test_no_active_booking_clears_stale_booked_flag(self, desk, user):
        Desk.objects.filter(pk=desk.pk).update(is_booked=True, booked_by=user)

        with patch("booking.tasks.get_channel_layer"), \
             patch("booking.tasks.async_to_sync"):
            from booking.tasks import startup_sync_desks
            startup_sync_desks()

        desk.refresh_from_db()
        assert desk.is_booked is False
        assert desk.booked_by is None

    @patch("booking.tasks.read_lock", return_value=None)
    def test_stale_lock_cleared_on_startup(self, _read, desk, user):
        Desk.objects.filter(pk=desk.pk).update(is_locked=True, locked_by=user)

        with patch("booking.tasks.get_channel_layer"), \
             patch("booking.tasks.async_to_sync"):
            from booking.tasks import startup_sync_desks
            startup_sync_desks()

        desk.refresh_from_db()
        assert desk.is_locked is False
        assert desk.locked_by is None


# ─── cleanup_expired_tokens ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestCleanupExpiredTokens:

    def test_completes_with_no_tokens_present(self):
        from booking.tasks import cleanup_expired_tokens
        result = cleanup_expired_tokens()
        assert "Cleaned up" in result