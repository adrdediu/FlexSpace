"""
Views for User Group management
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from ..models import UserGroup, Location
from ..serializers.usergroup import (
    UserGroupListSerializer,
    UserGroupDetailSerializer,
    UserGroupAddMembersSerializer,
    UserGroupRemoveMembersSerializer
)
from ..permissions import CanManageUserGroups, IsLocationManager


class UserGroupViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user groups within locations.
    
    Location Managers can:
    - Create groups in their locations
    - Edit groups
    - Add/remove members
    - Delete groups
    
    Room Managers can:
    - Add members (if location allows)
    """
    queryset = UserGroup.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UserGroupListSerializer
        return UserGroupDetailSerializer
    
    def get_queryset(self):
        """Filter groups based on user permissions"""
        user = self.request.user
        
        if user.is_superuser:
            return UserGroup.objects.all()
        
        # Location managers see their location's groups
        managed_locations = user.managed_locations.all()
        
        # Room managers see groups in their locations
        managed_rooms = user.managed_rooms.all()
        room_locations = Location.objects.filter(
            floors__rooms__in=managed_rooms
        ).distinct()
        
        all_location_ids = list(managed_locations.values_list('id', flat=True)) + \
                        list(room_locations.values_list('id', flat=True))
        return UserGroup.objects.filter(location_id__in=all_location_ids).distinct()
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Create a new user group"""
        location_id = request.data.get('location')
        
        if not location_id:
            return Response(
                {'error': 'Location is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        location = get_object_or_404(Location, pk=location_id)
        
        # Check if user can create groups in this location
        if not location.is_location_manager(request.user) and not request.user.is_superuser:
            return Response(
                {'error': 'Only location managers can create groups'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Update user group"""
        instance = self.get_object()
        
        # Check permissions
        if not instance.location.is_location_manager(request.user) and not request.user.is_superuser:
            # Check if room manager and only updating members
            if 'members' in request.data or 'member_ids' in request.data:
                if not instance.location.allow_room_managers_to_add_group_members:
                    return Response(
                        {'error': 'Room managers are not allowed to manage group members'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Verify user is a room manager in this location
                managed_rooms = request.user.managed_rooms.filter(
                    floor__location=instance.location
                )
                if not managed_rooms.exists():
                    return Response(
                        {'error': 'You do not have permission to manage this group'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                return Response(
                    {'error': 'Only location managers can edit group details'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete user group - only location managers"""
        instance = self.get_object()
        
        if not instance.location.is_location_manager(request.user) and not request.user.is_superuser:
            return Response(
                {'error': 'Only location managers can delete groups'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def add_members(self, request, pk=None):
        """
        Add members to a user group.
        Endpoint: POST /api/usergroups/{id}/add_members/
        Body: {"user_ids": [1, 2, 3]}
        """
        group = self.get_object()
        serializer = UserGroupAddMembersSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Check permissions
        can_manage = group.location.is_location_manager(request.user)
        
        if not can_manage:
            # Check if room manager and allowed
            if group.location.allow_room_managers_to_add_group_members:
                managed_rooms = request.user.managed_rooms.filter(
                    floor__location=group.location
                )
                can_manage = managed_rooms.exists()
        
        if not can_manage and not request.user.is_superuser:
            return Response(
                {'error': 'You do not have permission to add members to this group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_ids = serializer.validated_data['user_ids']
        
        # Add members
        from django.contrib.auth.models import User
        users = User.objects.filter(id__in=user_ids)
        group.members.add(*users)
        
        # Return updated group
        response_serializer = UserGroupDetailSerializer(group, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def remove_members(self, request, pk=None):
        """
        Remove members from a user group.
        Endpoint: POST /api/usergroups/{id}/remove_members/
        Body: {"user_ids": [1, 2, 3]}
        """
        group = self.get_object()
        serializer = UserGroupRemoveMembersSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Check permissions (same as add_members)
        can_manage = group.location.is_location_manager(request.user)
        
        if not can_manage:
            if group.location.allow_room_managers_to_add_group_members:
                managed_rooms = request.user.managed_rooms.filter(
                    floor__location=group.location
                )
                can_manage = managed_rooms.exists()
        
        if not can_manage and not request.user.is_superuser:
            return Response(
                {'error': 'You do not have permission to remove members from this group'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_ids = serializer.validated_data['user_ids']
        
        # Remove members
        from django.contrib.auth.models import User
        users = User.objects.filter(id__in=user_ids)
        group.members.remove(*users)
        
        # Return updated group
        response_serializer = UserGroupDetailSerializer(group, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """
        Get user groups for a specific location.
        Endpoint: GET /api/usergroups/by_location/?location_id=1
        """
        location_id = request.query_params.get('location_id')
        
        if not location_id:
            return Response(
                {'error': 'location_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        groups = self.get_queryset().filter(location_id=location_id)
        serializer = UserGroupListSerializer(groups, many=True, context={'request': request})
        
        return Response(serializer.data)