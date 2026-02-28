"""
Views for Location and Room management with admin permissions
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from ..models import Location, Room, Floor, UserGroup
from ..models_audit import AuditLog
from ..serializers.location import LocationSerializer, LocationListSerializer
from ..serializers.room import RoomSerializer, RoomListSerializer, RoomWithDesksSerializer
from ..permissions import IsLocationManager, IsRoomManager


class LocationManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Location management by Location Managers.
    
    Location Managers can:
    - View their managed locations
    - Update location settings
    - Manage location managers
    - Toggle room manager permissions for group management
    """
    queryset = Location.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return LocationListSerializer
        return LocationSerializer
    
    def get_queryset(self):
        """Filter locations based on user role"""
        user = self.request.user
        
        if user.is_superuser:
            return Location.objects.all()
        
        # Return locations where user is a location manager
        return user.managed_locations.all()
    
    def create(self, request, *args, **kwargs):
        """
        Create a new location - Only superusers can create new locations
        """
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can create new locations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create the location
        location = serializer.save()
        
        # Automatically add the creator as a location manager
        location.location_managers.add(request.user)
        
        # Return the updated location with manager info
        output_serializer = LocationSerializer(location, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a location - Only superusers can delete locations
        """
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can delete locations'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def add_managers(self, request, pk=None):
        """
        Add location managers.
        Endpoint: POST /api/locations/{id}/add_managers/
        Body: {"user_ids": [1, 2, 3]}
        """
        location = self.get_object()
        
        # Only superuser or existing location managers can add managers
        if not location.is_location_manager(request.user):
            return Response(
                {'error': 'Only location managers can add new managers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {'error': 'user_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        location.location_managers.add(*users)
        
        serializer = LocationSerializer(location, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_managers(self, request, pk=None):
        """
        Remove location managers.
        Endpoint: POST /api/locations/{id}/remove_managers/
        Body: {"user_ids": [1, 2, 3]}
        """
        location = self.get_object()
        
        if not location.is_location_manager(request.user):
            return Response(
                {'error': 'Only location managers can remove managers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {'error': 'user_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        location.location_managers.remove(*users)
        
        serializer = LocationSerializer(location, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def toggle_room_manager_permissions(self, request, pk=None):
        """
        Toggle whether room managers can add members to groups.
        Endpoint: POST /api/locations/{id}/toggle_room_manager_permissions/
        Body: {"allow": true/false}
        """
        location = self.get_object()
        
        if not location.is_location_manager(request.user):
            return Response(
                {'error': 'Only location managers can change this setting'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        allow = request.data.get('allow')
        
        if allow is None:
            return Response(
                {'error': 'allow parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        location.allow_room_managers_to_add_group_members = bool(allow)
        location.save()
        
        serializer = LocationSerializer(location, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def rooms(self, request, pk=None):
        """
        Get all rooms in this location.
        Endpoint: GET /api/locations/{id}/rooms/
        """
        location = self.get_object()
        rooms = Room.objects.filter(floor__location=location)
        
        serializer = RoomListSerializer(rooms, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def user_groups(self, request, pk=None):
        """
        Get all user groups in this location.
        Endpoint: GET /api/locations/{id}/user_groups/
        """
        location = self.get_object()
        groups = location.user_groups.all()
        
        from ..serializers.usergroup import UserGroupListSerializer
        serializer = UserGroupListSerializer(groups, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_allowed_groups(self, request, pk=None):
        """
        Set which user groups can access this location.
        Endpoint: POST /api/admin/locations/{id}/set_allowed_groups/
        Body: {"group_ids": [1, 2, 3]}  — empty list = open to everyone.
        Only location managers can call this.
        """
        location = self.get_object()

        if not location.is_location_manager(request.user):
            return Response(
                {'error': 'Only location managers can set allowed groups'},
                status=status.HTTP_403_FORBIDDEN
            )

        group_ids = request.data.get('group_ids', [])

        if group_ids:
            groups = UserGroup.objects.filter(id__in=group_ids)
            # All groups must belong to this location
            invalid = groups.exclude(location=location)
            if invalid.exists():
                return Response(
                    {'error': 'All groups must belong to this location'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            location.allowed_groups.set(groups)
        else:
            location.allowed_groups.clear()

        serializer = LocationSerializer(location, context={'request': request})
        return Response(serializer.data)


class RoomManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Room management by Room Managers and Location Managers.
    
    Room Managers can:
    - Edit room details (name, description, map image)
    - Manage room managers
    - Add allowed groups
    - Manage desks
    """
    queryset = Room.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return RoomListSerializer
        elif self.action == 'retrieve':
            return RoomWithDesksSerializer
        return RoomSerializer
    
    def get_queryset(self):
        """Filter rooms based on user permissions"""
        user = self.request.user
        
        if user.is_superuser:
            return Room.objects.all()
        
        # Rooms where user is a room manager
        managed_rooms = user.managed_rooms.all()
        
        # Rooms in locations where user is a location manager
        managed_locations = user.managed_locations.all()
        location_rooms = Room.objects.filter(floor__location__in=managed_locations)
        
        return (managed_rooms | location_rooms).distinct()
    
    def perform_create(self, serializer):
        """Create a new room"""
        floor_id = self.request.data.get('floor_id')
        floor = Floor.objects.get(id=floor_id)
        
        # Check if user can create rooms in this location
        if not floor.location.is_location_manager(self.request.user) and not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only location managers can create rooms')
        
        serializer.save()
    
    def perform_update(self, serializer):
        """Update room - check permissions"""
        room = self.get_object()
        
        # Room managers and location managers can update
        if not room.is_room_manager(self.request.user) and not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to edit this room')
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """Delete room - only location managers"""
        if not instance.floor.location.is_location_manager(self.request.user) and not self.request.user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only location managers can delete rooms')
        
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def add_managers(self, request, pk=None):
        """
        Add room managers.
        Endpoint: POST /api/rooms/{id}/add_managers/
        Body: {"user_ids": [1, 2, 3]}
        """
        room = self.get_object()
        
        # Only location managers can appoint room managers
        if not room.floor.location.is_location_manager(request.user):
            return Response(
                {'error': 'Only location managers can appoint room managers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {'error': 'user_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        room.room_managers.add(*users)
        
        serializer = RoomSerializer(room, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_managers(self, request, pk=None):
        """
        Remove room managers.
        Endpoint: POST /api/rooms/{id}/remove_managers/
        Body: {"user_ids": [1, 2, 3]}
        """
        room = self.get_object()
        
        if not room.floor.location.is_location_manager(request.user):
            return Response(
                {'error': 'Only location managers can remove room managers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_ids = request.data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {'error': 'user_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        room.room_managers.remove(*users)
        
        serializer = RoomSerializer(room, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_allowed_groups(self, request, pk=None):
        """
        Set which user groups can book in this room.
        Endpoint: POST /api/rooms/{id}/set_allowed_groups/
        Body: {"group_ids": [1, 2, 3]}
        """
        room = self.get_object()
        
        if not room.is_room_manager(request.user):
            return Response(
                {'error': 'Only room managers can set allowed groups'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        group_ids = request.data.get('group_ids', [])
        
        # Validate groups belong to the same location
        if group_ids:
            groups = UserGroup.objects.filter(id__in=group_ids)
            invalid_groups = groups.exclude(location=room.floor.location)
            
            if invalid_groups.exists():
                return Response(
                    {'error': 'All groups must belong to the same location as the room'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            room.allowed_groups.set(groups)
        else:
            # Empty list clears all groups (allows everyone)
            room.allowed_groups.clear()
        
        serializer = RoomSerializer(room, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='upload-map')
    def upload_map(self, request, pk=None):
        """
        Upload a new room map image.
        Endpoint: POST /api/rooms/{id}/upload_map/
        Body: multipart/form-data with 'map_image' file
        """
        room = self.get_object()
        
        if not room.is_room_manager(request.user):
            return Response(
                {'error': 'Only room managers can upload room maps'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if 'map_image' not in request.FILES:
            return Response(
                {'error': 'map_image file is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete old map if exists
        if room.map_image:
            room.map_image.delete(save=False)
        
        room.map_image = request.FILES['map_image']
        room.save()
        
        serializer = RoomSerializer(room, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'], url_path='delete-map')
    def delete_map(self, request, pk=None):
        """
        Delete the room map image.
        Endpoint: DELETE /api/rooms/{id}/delete_map/
        """
        room = self.get_object()
        
        if not room.is_room_manager(request.user):
            return Response(
                {'error': 'Only room managers can delete room maps'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if room.map_image:
            room.map_image.delete(save=True)
        
        serializer = RoomSerializer(room, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='set-maintenance')
    def set_maintenance(self, request, pk=None):
        room = self.get_object()
        if not room.is_room_manager(request.user) and not request.user.is_superuser:
            return Response({'error': 'Only room managers can set maintenance mode'}, status=status.HTTP_403_FORBIDDEN)

        if room.is_under_maintenance:
            return Response({'is_under_maintenance': True, 'maintenance_by_name': room.maintenance_by_name})

        by = request.user.get_full_name() or request.user.username
        room.is_under_maintenance = True
        room.maintenance_by_name = by
        room.save(update_fields=['is_under_maintenance', 'maintenance_by_name'])

        AuditLog.log(
            user=request.user,
            action=AuditLog.Action.ROOM_MAINTENANCE,
            target_type='room',
            target_id=room.id,
            target_snapshot={
                'room': room.name,
                'room_id': room.id,
                'location': room.floor.location.name,
                'location_id': room.floor.location.id,
                'maintenance': True,
                'by': by,
            },
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        event = {'type': 'room_maintenance', 'room_id': room.id, 'enabled': True, 'by': by}
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(f'room_{room.id}', event)
        async_to_sync(channel_layer.group_send)(f'location_{room.floor.location_id}', event)
        return Response({'is_under_maintenance': True, 'maintenance_by_name': by})

    @action(detail=True, methods=['post'], url_path='clear-maintenance')
    def clear_maintenance(self, request, pk=None):
        room = self.get_object()
        if not room.is_room_manager(request.user) and not request.user.is_superuser:
            return Response({'error': 'Only room managers can clear maintenance mode'}, status=status.HTTP_403_FORBIDDEN)

        if not room.is_under_maintenance:
            return Response({'is_under_maintenance': False, 'maintenance_by_name': ''})

        by = request.user.get_full_name() or request.user.username
        room.is_under_maintenance = False
        room.maintenance_by_name = ''
        room.save(update_fields=['is_under_maintenance', 'maintenance_by_name'])

        AuditLog.log(
            user=request.user,
            action=AuditLog.Action.ROOM_MAINTENANCE,
            target_type='room',
            target_id=room.id,
            target_snapshot={
                'room': room.name,
                'room_id': room.id,
                'location': room.floor.location.name,
                'location_id': room.floor.location.id,
                'maintenance': False,
                'by': by,
            },
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        event = {'type': 'room_maintenance', 'room_id': room.id, 'enabled': False, 'by': by}
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(f'room_{room.id}', event)
        async_to_sync(channel_layer.group_send)(f'location_{room.floor.location_id}', event)
        return Response({'is_under_maintenance': False, 'maintenance_by_name': ''})