"""
Permissions module for FlexSpace
Handles role-based access control for Location Managers and Room Managers
"""
from rest_framework import permissions
from .models import Location, Room, UserGroup


class IsLocationManager(permissions.BasePermission):
    """
    Permission check for Location Manager role.
    Location Managers can:
    - Manage their assigned locations
    - Create/edit user groups within their locations
    - Appoint room managers
    - Create and manage rooms
    - Have all room manager permissions for their location
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Superusers have all permissions
        if user.is_superuser:
            return True
        
        # Determine the location based on object type
        if isinstance(obj, Location):
            return obj.is_location_manager(user)
        elif isinstance(obj, Room):
            return obj.floor.location.is_location_manager(user)
        elif isinstance(obj, UserGroup):
            return obj.location.is_location_manager(user)
        
        return False


class IsRoomManager(permissions.BasePermission):
    """
    Permission check for Room Manager role.
    Room Managers can:
    - Edit room details (name, description, map image)
    - Manage desk positions and assignments
    - Add users to groups (if location manager allows)
    - Manage permanent desk assignments
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Superusers have all permissions
        if user.is_superuser:
            return True
        
        # Check if user is room manager
        if isinstance(obj, Room):
            return obj.is_room_manager(user)
        
        # For desks, check if user manages the room
        if hasattr(obj, 'room'):
            return obj.room.is_room_manager(user)
        
        return False


class CanManageUserGroups(permissions.BasePermission):
    """
    Permission to manage user groups.
    - Location Managers can always manage groups in their locations
    - Room Managers can add members if allowed by location manager
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        if user.is_superuser:
            return True
        
        if isinstance(obj, UserGroup):
            location = obj.location
            
            # Location managers can do everything
            if location.is_location_manager(user):
                return True
            
            # Room managers can only add members if allowed
            if request.method in ['PUT', 'PATCH']:
                # Check if they're only modifying members
                if 'members' in request.data and location.allow_room_managers_to_add_group_members:
                    # Check if user is a room manager in this location
                    managed_rooms = user.managed_rooms.filter(floor__location=location)
                    return managed_rooms.exists()
        
        return False


class CanBookInRoom(permissions.BasePermission):
    """
    Permission to check if user can book desks in a room.
    Users can book if:
    - They are staff/superuser
    - They belong to an allowed group for the room
    - Room has no group restrictions
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # For booking creation
        if hasattr(obj, 'room'):
            room = obj.room
        elif isinstance(obj, Room):
            room = obj
        else:
            return True
        
        return room.can_user_book(user)


class IsLocationManagerOrReadOnly(permissions.BasePermission):
    """
    Allow location managers to edit, everyone else read-only
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        user = request.user
        
        if user.is_superuser:
            return True
        
        if isinstance(obj, Location):
            return obj.is_location_manager(user)
        elif isinstance(obj, Room):
            return obj.floor.location.is_location_manager(user)
        
        return False


class IsRoomManagerOrReadOnly(permissions.BasePermission):
    """
    Allow room managers to edit, everyone else read-only
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        user = request.user
        
        if user.is_superuser:
            return True
        
        if isinstance(obj, Room):
            return obj.is_room_manager(user)
        
        if hasattr(obj, 'room'):
            return obj.room.is_room_manager(user)
        
        return False