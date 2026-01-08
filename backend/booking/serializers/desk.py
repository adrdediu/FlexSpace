from rest_framework import serializers
from ..models import Desk

class DeskSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    locked_by = serializers.CharField(source='locked_by.username', read_only=True)
    booked_by = serializers.CharField(source='booked_by.username', read_only=True)
    permanent_assignee = serializers.CharField(source='permanent_assignee.username', read_only=True)
    class Meta:
        model = Desk
        fields = [
            'id',
            'name',
            'pos_x',
            'pos_y',
            'is_booked',
            'booked_by',
            'is_locked',
            'locked_by',
            'room',
            'room_name',
            'orientation',
            'is_permanent',
            'permanent_assignee',
        ]
        read_only_fields = ['is_booked','is_locked','locked_by','room_name','orientation','is_permanent','permanent_assignee']