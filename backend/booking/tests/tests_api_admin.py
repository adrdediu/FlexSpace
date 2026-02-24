"""
tests_api_admin.py — Integration tests for admin management endpoints.

What is tested:
  /api/admin/locations/   LocationManagementViewSet (CRUD + custom actions)
  /api/admin/rooms/       RoomManagementViewSet     (CRUD + maintenance + groups)
  /api/desks/             DeskViewSet               (permanent assignment)
  /api/usergroups/        UserGroupViewSet           (create, members, delete)

Key correctness notes applied:
  - RoomManagementViewSet.perform_create reads request.data['floor_id'], not 'floor'
  - set_maintenance / clear_maintenance broadcast via channel layer → must be mocked
  - url_path='set-maintenance' → URL is /set-maintenance/ (hyphen, not underscore)
  - LocationManagementViewSet queryset scoped to managed_locations → non-manager gets 404
"""
import pytest
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta

from booking.models import Location, Room, Floor, Desk, UserGroup, Booking


def future(hours=1):
    return timezone.now() + timedelta(hours=hours)


# ─── Location management ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestLocationManagement:

    def test_superuser_can_create_location(self, admin_client, country):
        # Serializer exposes country_id as the write field, not country
        resp = admin_client.post("/api/admin/locations/", {
            "name": "New Office", "country_id": country.id,
        }, format="json")
        assert resp.status_code == 201
        assert Location.objects.filter(name="New Office").exists()

    def test_regular_user_cannot_create_location(self, auth_client, country):
        resp = auth_client.post("/api/admin/locations/", {
            "name": "Sneaky Office", "country_id": country.id,
        }, format="json")
        assert resp.status_code == 403

    def test_superuser_can_delete_location(self, admin_client, location):
        resp = admin_client.delete(f"/api/admin/locations/{location.id}/")
        assert resp.status_code == 204
        assert not Location.objects.filter(pk=location.id).exists()

    def test_location_manager_cannot_delete_location(self, api_client, location, user):
        location.location_managers.add(user)
        api_client.force_authenticate(user=user)
        resp = api_client.delete(f"/api/admin/locations/{location.id}/")
        assert resp.status_code == 403

    def test_location_manager_can_retrieve_their_location(self, api_client, location, user):
        location.location_managers.add(user)
        api_client.force_authenticate(user=user)
        resp = api_client.get(f"/api/admin/locations/{location.id}/")
        assert resp.status_code == 200
        assert resp.data["name"] == location.name

    def test_non_manager_cannot_see_location_in_admin_view(self, api_client, location, user):
        """Queryset is scoped to managed locations → returns 404 for non-managers."""
        api_client.force_authenticate(user=user)
        resp = api_client.get(f"/api/admin/locations/{location.id}/")
        assert resp.status_code == 404

    def test_add_managers_to_location(self, admin_client, location, user2):
        resp = admin_client.post(
            f"/api/admin/locations/{location.id}/add_managers/",
            {"user_ids": [user2.id]},
            format="json",
        )
        assert resp.status_code == 200
        location.refresh_from_db()
        assert location.location_managers.filter(pk=user2.id).exists()

    def test_remove_managers_from_location(self, admin_client, location, user2):
        location.location_managers.add(user2)
        resp = admin_client.post(
            f"/api/admin/locations/{location.id}/remove_managers/",
            {"user_ids": [user2.id]},
            format="json",
        )
        assert resp.status_code == 200
        location.refresh_from_db()
        assert not location.location_managers.filter(pk=user2.id).exists()

    def test_set_allowed_groups_restricts_location(self, admin_client, location, user):
        g = UserGroup.objects.create(name="VIP", location=location, created_by=user)
        resp = admin_client.post(
            f"/api/admin/locations/{location.id}/set_allowed_groups/",
            {"group_ids": [g.id]},
            format="json",
        )
        assert resp.status_code == 200
        location.refresh_from_db()
        assert location.allowed_groups.filter(pk=g.id).exists()

    def test_toggle_room_manager_permissions_on(self, admin_client, location):
        resp = admin_client.post(
            f"/api/admin/locations/{location.id}/toggle_room_manager_permissions/",
            {"allow": True},
            format="json",
        )
        assert resp.status_code == 200
        location.refresh_from_db()
        assert location.allow_room_managers_to_add_group_members is True

    def test_toggle_room_manager_permissions_off(self, admin_client, location):
        location.allow_room_managers_to_add_group_members = True
        location.save()
        resp = admin_client.post(
            f"/api/admin/locations/{location.id}/toggle_room_manager_permissions/",
            {"allow": False},
            format="json",
        )
        assert resp.status_code == 200
        location.refresh_from_db()
        assert location.allow_room_managers_to_add_group_members is False


# ─── Room management ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRoomManagement:

    def test_location_manager_can_create_room(self, api_client, location, floor, user):
        location.location_managers.add(user)
        api_client.force_authenticate(user=user)
        # perform_create reads request.data['floor_id'] not 'floor'
        resp = api_client.post("/api/admin/rooms/", {
            "name": "Conference A",
            "floor_id": floor.id,
        }, format="json")
        assert resp.status_code == 201
        assert Room.objects.filter(name="Conference A", floor=floor).exists()

    def test_regular_user_cannot_create_room(self, auth_client, floor):
        resp = auth_client.post("/api/admin/rooms/", {
            "name": "Sneaky Room", "floor_id": floor.id,
        }, format="json")
        assert resp.status_code in (400, 403)

    def test_add_room_managers(self, admin_client, room, user2):
        resp = admin_client.post(
            f"/api/admin/rooms/{room.id}/add_managers/",
            {"user_ids": [user2.id]},
            format="json",
        )
        assert resp.status_code == 200
        room.refresh_from_db()
        assert room.room_managers.filter(pk=user2.id).exists()

    def test_remove_room_managers(self, admin_client, room, user2):
        room.room_managers.add(user2)
        resp = admin_client.post(
            f"/api/admin/rooms/{room.id}/remove_managers/",
            {"user_ids": [user2.id]},
            format="json",
        )
        assert resp.status_code == 200
        room.refresh_from_db()
        assert not room.room_managers.filter(pk=user2.id).exists()

    def test_set_allowed_groups_on_room(self, admin_client, room, location, user):
        g = UserGroup.objects.create(name="Devs", location=location, created_by=user)
        resp = admin_client.post(
            f"/api/admin/rooms/{room.id}/set_allowed_groups/",
            {"group_ids": [g.id]},
            format="json",
        )
        assert resp.status_code == 200
        room.refresh_from_db()
        assert room.allowed_groups.filter(pk=g.id).exists()

    @patch("booking.admin_views_module.admin_views.async_to_sync")
    @patch("booking.admin_views_module.admin_views.get_channel_layer")
    def test_room_manager_can_enable_maintenance(self, _layer, _async, api_client, room, user):
        room.room_managers.add(user)
        api_client.force_authenticate(user=user)
        # url_path='set-maintenance' → /api/admin/rooms/{id}/set-maintenance/
        resp = api_client.post(f"/api/admin/rooms/{room.id}/set-maintenance/")
        assert resp.status_code == 200
        room.refresh_from_db()
        assert room.is_under_maintenance is True
        # maintenance_by_name is get_full_name() or username
        assert user.username in room.maintenance_by_name or room.maintenance_by_name != ""

    @patch("booking.admin_views_module.admin_views.async_to_sync")
    @patch("booking.admin_views_module.admin_views.get_channel_layer")
    def test_room_manager_can_clear_maintenance(self, _layer, _async, api_client, room, user):
        room.room_managers.add(user)
        room.is_under_maintenance = True
        room.maintenance_by_name = user.username
        room.save()
        api_client.force_authenticate(user=user)
        resp = api_client.post(f"/api/admin/rooms/{room.id}/clear-maintenance/")
        assert resp.status_code == 200
        room.refresh_from_db()
        assert room.is_under_maintenance is False
        assert room.maintenance_by_name == ""

    @patch("booking.admin_views_module.admin_views.async_to_sync")
    @patch("booking.admin_views_module.admin_views.get_channel_layer")
    def test_non_manager_cannot_enable_maintenance(self, _layer, _async, auth_client, room):
        """Non-manager hits the queryset scope → 403 or 404."""
        resp = auth_client.post(f"/api/admin/rooms/{room.id}/set-maintenance/")
        assert resp.status_code in (403, 404)


# ─── Permanent desk assignment ────────────────────────────────────────────────

@pytest.mark.django_db
class TestPermanentDeskAssignment:

    def test_room_manager_can_assign_permanent_desk(self, api_client, desk, room, user, user2):
        room.room_managers.add(user)
        api_client.force_authenticate(user=user)
        resp = api_client.post(
            f"/api/desks/{desk.id}/assign-permanent/",
            {"user_id": user2.id},
            format="json",
        )
        assert resp.status_code == 200
        desk.refresh_from_db()
        assert desk.is_permanent is True
        assert desk.permanent_assignee == user2

    def test_regular_user_cannot_assign_permanent_desk(self, auth_client, desk, user2):
        resp = auth_client.post(
            f"/api/desks/{desk.id}/assign-permanent/",
            {"user_id": user2.id},
            format="json",
        )
        assert resp.status_code in (400, 403)

    def test_assign_permanent_missing_user_id_returns_400(self, api_client, desk, room, user):
        room.room_managers.add(user)
        api_client.force_authenticate(user=user)
        resp = api_client.post(f"/api/desks/{desk.id}/assign-permanent/", {}, format="json")
        assert resp.status_code == 400

    def test_assign_permanent_nonexistent_user_returns_404(self, api_client, desk, room, user):
        room.room_managers.add(user)
        api_client.force_authenticate(user=user)
        resp = api_client.post(
            f"/api/desks/{desk.id}/assign-permanent/",
            {"user_id": 99999},
            format="json",
        )
        assert resp.status_code == 404

    def test_room_manager_can_clear_permanent_assignment(
        self, api_client, desk, room, user, user2
    ):
        room.room_managers.add(user)
        desk.is_permanent = True
        desk.permanent_assignee = user2
        desk.save()
        api_client.force_authenticate(user=user)
        resp = api_client.post(f"/api/desks/{desk.id}/clear-permanent/")
        assert resp.status_code == 200
        desk.refresh_from_db()
        assert desk.is_permanent is False
        assert desk.permanent_assignee is None

    def test_only_assignee_can_book_permanent_desk(
        self, api_client, desk, room, location, user, user2, user3
    ):
        room.room_managers.add(user)
        desk.is_permanent = True
        desk.permanent_assignee = user2
        desk.save()

        g = UserGroup.objects.create(name="G", location=location, created_by=user)
        g.members.add(user2, user3)
        room.allowed_groups.add(g)

        # user3 is in the group but is not the assignee → blocked
        api_client.force_authenticate(user=user3)
        resp = api_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": (timezone.now() + timedelta(hours=1)).isoformat(),
            "end_time": (timezone.now() + timedelta(hours=3)).isoformat(),
        }, format="json")
        assert resp.status_code in (400, 403)

        # user2 is the assignee → succeeds
        api_client.force_authenticate(user=user2)
        resp = api_client.post("/api/bookings/", {
            "desk_id": desk.id,
            "start_time": (timezone.now() + timedelta(hours=1)).isoformat(),
            "end_time": (timezone.now() + timedelta(hours=3)).isoformat(),
        }, format="json")
        assert resp.status_code == 201


# ─── User group management ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUserGroupManagement:

    def test_location_manager_can_create_group(self, api_client, location, user):
        location.location_managers.add(user)
        api_client.force_authenticate(user=user)
        resp = api_client.post("/api/usergroups/", {
            "name": "Backend Team", "location": location.id,
        }, format="json")
        assert resp.status_code == 201
        assert UserGroup.objects.filter(name="Backend Team", location=location).exists()

    def test_regular_user_cannot_create_group(self, auth_client, location):
        resp = auth_client.post("/api/usergroups/", {
            "name": "Sneaky Group", "location": location.id,
        }, format="json")
        assert resp.status_code == 403

    def test_location_manager_can_add_members(self, api_client, location, user, user2):
        location.location_managers.add(user)
        g = UserGroup.objects.create(name="Team", location=location, created_by=user)
        api_client.force_authenticate(user=user)
        resp = api_client.post(
            f"/api/usergroups/{g.id}/add_members/",
            {"user_ids": [user2.id]},
            format="json",
        )
        assert resp.status_code == 200
        assert g.members.filter(pk=user2.id).exists()

    def test_location_manager_can_remove_members(self, api_client, location, user, user2):
        location.location_managers.add(user)
        g = UserGroup.objects.create(name="Team", location=location, created_by=user)
        g.members.add(user2)
        api_client.force_authenticate(user=user)
        resp = api_client.post(
            f"/api/usergroups/{g.id}/remove_members/",
            {"user_ids": [user2.id]},
            format="json",
        )
        assert resp.status_code == 200
        assert not g.members.filter(pk=user2.id).exists()

    def test_room_manager_can_add_members_when_flag_enabled(
        self, api_client, location, room, user, user2, user3
    ):
        location.allow_room_managers_to_add_group_members = True
        location.save()
        room.room_managers.add(user)
        g = UserGroup.objects.create(name="Team", location=location, created_by=user2)
        api_client.force_authenticate(user=user)
        resp = api_client.post(
            f"/api/usergroups/{g.id}/add_members/",
            {"user_ids": [user3.id]},
            format="json",
        )
        assert resp.status_code == 200
        assert g.members.filter(pk=user3.id).exists()

    def test_room_manager_blocked_when_flag_disabled(
        self, api_client, location, room, user, user2, user3
    ):
        location.allow_room_managers_to_add_group_members = False
        location.save()
        room.room_managers.add(user)
        g = UserGroup.objects.create(name="Team", location=location, created_by=user2)
        api_client.force_authenticate(user=user)
        resp = api_client.post(
            f"/api/usergroups/{g.id}/add_members/",
            {"user_ids": [user3.id]},
            format="json",
        )
        assert resp.status_code == 403

    def test_location_manager_can_delete_group(self, api_client, location, user):
        location.location_managers.add(user)
        g = UserGroup.objects.create(name="TempGroup", location=location, created_by=user)
        api_client.force_authenticate(user=user)
        resp = api_client.delete(f"/api/usergroups/{g.id}/")
        assert resp.status_code == 204
        assert not UserGroup.objects.filter(pk=g.id).exists()

    def test_regular_user_cannot_delete_group(self, auth_client, location, user):
        g = UserGroup.objects.create(name="TempGroup", location=location, created_by=user)
        resp = auth_client.delete(f"/api/usergroups/{g.id}/")
        assert resp.status_code in (403, 404)