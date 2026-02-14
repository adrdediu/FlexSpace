from rest_framework import serializers
from ..models_preferences import UserPreferences
from ..models import Location


class UserPreferencesSerializer(serializers.ModelSerializer):
    default_location_name = serializers.CharField(source='default_location.name', read_only=True)
    
    class Meta:
        model = UserPreferences
        fields = [
            'theme', 'language', 'timezone', 'date_format', 'time_format',
            'default_location', 'default_location_name', 'default_booking_duration'
        ]
    
    def update(self, instance, validated_data):
        # Update all fields
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance