"""
Shared pytest fixtures for FlexSpace backend tests.
"""
import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient

from booking.models import Country, Location, Floor, Room, Desk, Booking, UserGroup


def future(hours=1):
    return timezone.now() + timedelta(hours=hours)

def past(hours=1):
    return timezone.now() - timedelta(hours=hours)


# ─── Users ────────────────────────────────────────────────────────────────────

@pytest.fixture
def superuser(db):
    return User.objects.create_superuser("admin", "admin@test.com", "pass")

@pytest.fixture
def user(db):
    return User.objects.create_user("alice", "alice@test.com", "pass")

@pytest.fixture
def user2(db):
    return User.objects.create_user("bob", "bob@test.com", "pass")

@pytest.fixture
def user3(db):
    return User.objects.create_user("carol", "carol@test.com", "pass")


# ─── Location hierarchy ───────────────────────────────────────────────────────
# Supply all non-null fields explicitly to avoid migration-dependent NOT NULL errors.

@pytest.fixture
def country(db):
    return Country.objects.create(
        name="Testland",
        country_code="TL",
        lat=0.0,
        lng=0.0,
    )

@pytest.fixture
def location(db, country):
    return Location.objects.create(
        name="HQ",
        country=country,
        lat=0.0,
        lng=0.0,
        country_code="TL",
    )

@pytest.fixture
def floor(db, location):
    return Floor.objects.create(name="Floor 1", location=location)

@pytest.fixture
def room(db, floor):
    return Room.objects.create(name="Room A", floor=floor)

@pytest.fixture
def desk(db, room):
    return Desk.objects.create(name="Desk 1", room=room)

@pytest.fixture
def desk2(db, room):
    return Desk.objects.create(name="Desk 2", room=room)


# ─── API clients ──────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

@pytest.fixture
def auth_client2(user2):
    c = APIClient()
    c.force_authenticate(user=user2)
    return c

@pytest.fixture
def auth_client3(user3):
    c = APIClient()
    c.force_authenticate(user=user3)
    return c

@pytest.fixture
def admin_client(superuser):
    c = APIClient()
    c.force_authenticate(user=superuser)
    return c


# ─── Helpers ──────────────────────────────────────────────────────────────────

def grant_access(user, room, location, group_name="TestGroup"):
    """Add user to an allowed UserGroup on room so they can book."""
    g, _ = UserGroup.objects.get_or_create(
        name=group_name,
        location=location,
        defaults={"created_by": user},
    )
    g.members.add(user)
    room.allowed_groups.add(g)
    return g


def bulk_booking(user, desk, start, end):
    """Create a Booking bypassing full_clean() — allows past start_times."""
    Booking.objects.bulk_create([
        Booking(user=user, desk=desk, start_time=start, end_time=end)
    ])
    return Booking.objects.filter(user=user, desk=desk, start_time=start).first()