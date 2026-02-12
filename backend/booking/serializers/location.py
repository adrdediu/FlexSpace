from .floor import FloorSerializer
from .country import CountrySerializer
from ..models import Location
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


class LocationSerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    floors = FloorSerializer(many=True, read_only=True)
    location_managers = LocationManagerSerializer(many=True, read_only=True)
    location_manager_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='location_managers',
        write_only=True,
        required=False
    )
    is_manager = serializers.SerializerMethodField()
    user_group_count = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = [
            'id', 'name', 'country', 'lat', 'lng', 'country_code',
            'floors', 'location_managers', 'location_manager_ids',
            'allow_room_managers_to_add_group_members',
            'is_manager', 'user_group_count'
        ]
        read_only_fields = ['id']
    
    def get_is_manager(self, obj):
        """Check if current user is a location manager"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.is_location_manager(request.user)
        return False
    
    def get_user_group_count(self, obj):
        """Get count of user groups in this location"""
        return obj.user_groups.count()


class LocationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing locations"""
    country_name = serializers.CharField(source='country.name', read_only=True)
    floor_count = serializers.SerializerMethodField()
    room_count = serializers.SerializerMethodField()
    is_manager = serializers.SerializerMethodField()
    
    class Meta:
        model = Location
        fields = [
            'id', 'name', 'country', 'country_name', 'lat', 'lng',
            'floor_count', 'room_count', 'is_manager'
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