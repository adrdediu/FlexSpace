from rest_framework import serializers
from django.contrib.auth.models import User

from .desk import DeskSerializer
from ..models import Floor, Room, UserGroup

class BasicFloorSerializer(serializers.ModelSerializer):
    location_id = serializers.IntegerField(source='location.id', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = Floor
        fields = ['id', 'name', 'location', 'location_id', 'location_name']


class RoomManagerSerializer(serializers.ModelSerializer):
    """Simplified user serializer for room managers"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'email']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class AllowedGroupSerializer(serializers.ModelSerializer):
    """Simplified user group serializer for room access"""
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    
    class Meta:
        model = UserGroup
        fields = ['id', 'name', 'description', 'member_count']
        read_only_fields = ['id', 'name', 'description']


class RoomSerializer(serializers.ModelSerializer):
    floor = BasicFloorSerializer(read_only=True)
    floor_id = serializers.PrimaryKeyRelatedField(
        queryset=Floor.objects.all(),
        write_only=True,
        source='floor'
    )
    room_managers = RoomManagerSerializer(many=True, read_only=True)
    room_manager_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='room_managers',
        write_only=True,
        required=False
    )
    allowed_groups = AllowedGroupSerializer(many=True, read_only=True)
    allowed_group_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=UserGroup.objects.all(),
        source='allowed_groups',
        write_only=True,
        required=False
    )
    is_manager = serializers.SerializerMethodField()
    can_book = serializers.SerializerMethodField()
    desk_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'name', 'description', 'floor', 'floor_id', 'map_image',
            'room_managers', 'room_manager_ids',
            'allowed_groups', 'allowed_group_ids',
            'is_manager', 'can_book', 'desk_count',
            'is_under_maintenance', 'maintenance_by_name'
        ]
        read_only_fields = ['id']
    
    def get_is_manager(self, obj):
        """Check if current user is a room manager"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.is_room_manager(request.user)
        return False
    
    def get_can_book(self, obj):
        """Check if current user can book in this room"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.can_user_book(request.user)
        return False
    
    def get_desk_count(self, obj):
        return obj.desks.count()


class RoomListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing rooms"""
    floor_name = serializers.CharField(source='floor.name', read_only=True)
    location_name = serializers.CharField(source='floor.location.name', read_only=True)
    desk_count = serializers.SerializerMethodField()
    available_desk_count = serializers.SerializerMethodField()
    is_manager = serializers.SerializerMethodField()
    can_book = serializers.SerializerMethodField()
    
    class Meta:
        model = Room
        fields = [
            'id', 'name', 'description', 'floor', 'floor_name',
            'location_name', 'map_image', 'desk_count',
            'available_desk_count', 'is_manager', 'can_book',
            'is_under_maintenance', 'maintenance_by_name'
        ]
        read_only_fields = ['id']
    
    def get_desk_count(self, obj):
        return obj.desks.count()
    
    def get_available_desk_count(self, obj):
        return obj.desks.filter(is_booked=False, is_permanent=False).count()
    
    def get_is_manager(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.is_room_manager(request.user)
        return False
    
    def get_can_book(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.can_user_book(request.user)
        return False


class RoomWithDesksSerializer(RoomSerializer):
    desks = DeskSerializer(many=True, read_only=True)

    class Meta(RoomSerializer.Meta):
        fields = RoomSerializer.Meta.fields + ['desks']