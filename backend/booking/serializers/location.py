from .floor import FloorSerializer
from .country import CountrySerializer
from ..models import Location, Country, UserGroup
from rest_framework import serializers
from django.contrib.auth.models import User


class LocationManagerSerializer(serializers.ModelSerializer):
    """Simplified user serializer for location managers"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'email']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class AllowedLocationGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source='members.count', read_only=True)
    class Meta:
        model = UserGroup
        fields = ['id', 'name', 'description', 'member_count']
        read_only_fields = ['id', 'name', 'description']


class LocationSerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.all(),
        source='country',
        write_only=True,
        required=True
    )
    country_name = serializers.CharField(source='country.name', read_only=True)
    floors = FloorSerializer(many=True, read_only=True)
    location_managers = LocationManagerSerializer(many=True, read_only=True)
    location_manager_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='location_managers',
        write_only=True,
        required=False
    )
    allowed_groups = AllowedLocationGroupSerializer(many=True, read_only=True)
    allowed_group_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=UserGroup.objects.all(),
        source='allowed_groups',
        write_only=True,
        required=False
    )
    is_manager = serializers.SerializerMethodField()
    can_access = serializers.SerializerMethodField()
    user_group_count = serializers.SerializerMethodField()
    floor_count = serializers.SerializerMethodField()
    room_count = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = [
            'id', 'name', 'country', 'country_id', 'country_name', 'lat', 'lng', 'country_code',
            'floors', 'location_managers', 'location_manager_ids',
            'allowed_groups', 'allowed_group_ids',
            'allow_room_managers_to_add_group_members',
            'is_manager', 'can_access', 'user_group_count', 'floor_count', 'room_count'
        ]
        read_only_fields = ['id']
    
    def get_is_manager(self, obj):
        """Check if current user is a location manager"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.is_location_manager(request.user)
        return False

    def get_can_access(self, obj):
        """Check if current user can access this location"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.can_user_access(request.user)
        return True
    
    def get_user_group_count(self, obj):
        """Get count of user groups in this location"""
        return obj.user_groups.count()
    
    def get_floor_count(self, obj):
        """Get count of floors in this location"""
        return obj.floors.count()
    
    def get_room_count(self, obj):
        """Get count of rooms across all floors in this location"""
        from ..models import Room
        return Room.objects.filter(floor__location=obj).count()


class LocationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing locations"""
    country_name = serializers.CharField(source='country.name', read_only=True)
    floor_count = serializers.SerializerMethodField()
    room_count = serializers.SerializerMethodField()
    is_manager = serializers.SerializerMethodField()
    can_access = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = [
            'id', 'name', 'country', 'country_name', 'lat', 'lng',
            'floor_count', 'room_count', 'is_manager', 'can_access'
        ]
        read_only_fields = ['id']
    
    def get_floor_count(self, obj):
        return obj.floors.count()
    
    def get_room_count(self, obj):
        from ..models import Room
        return Room.objects.filter(floor__location=obj).count()
    
    def get_is_manager(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.is_location_manager(request.user)
        return False

    def get_can_access(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.can_user_access(request.user)
        return True