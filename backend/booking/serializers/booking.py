from rest_framework import serializers
from .desk import DeskSerializer
from ..models import Booking, Desk

class BookingSerializer(serializers.ModelSerializer):

    desk = DeskSerializer(read_only=True)

    username = serializers.CharField(source='user.username', read_only=True)

    room_name = serializers.CharField(source='desk.room.name', read_only=True)
    floor_name = serializers.CharField(source='desk.room.floor.name', read_only=True)
    floor_id = serializers.CharField(source='desk.room.floor.id', read_only=True)
    location_name = serializers.CharField(source='desk.room.floor.location.name', read_only=True)
    location_id = serializers.CharField(source='desk.room.floor.location.id', read_only=True)

    # Desk id needed for creating a booking
    desk_id = serializers.PrimaryKeyRelatedField(
        queryset=Desk.objects.select_related(
            'room__floor__location',
            'locked_by',
            'booked_by',
            'permanent_assignee'
        ),
        source='desk',
        write_only=True
    )

    class Meta:
        model = Booking
        fields = [
            'id',
            'desk',
            'desk_id',
            'user',
            'username',
            'room_name',
            'floor_name',
            'floor_id',
            'location_name',
            'location_id',
            'start_time',
            'end_time'
        ]
        read_only_fields = [
            'id',
            'user',
            'username',
            'desk',
            'room_name',
            'floor_name',
            'floor_id',
            'location_name',
            'location_id'
        ]
    
    def create(self, validated_data):
        # During creation, the user is injected from request prop
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)