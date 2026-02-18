from rest_framework import serializers
from django.contrib.auth import get_user_model
from ..models import Desk

User = get_user_model()

class DeskSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    locked_by = serializers.CharField(source='locked_by.username', read_only=True)
    booked_by = serializers.CharField(source='booked_by.username', read_only=True)

    # Read-only display of permanent assignee username
    permanent_assignee_username = serializers.CharField(
        source='permanent_assignee.username',
        read_only=True
    )
    permanent_assignee_full_name = serializers.SerializerMethodField()

    # Write: accept a user ID to assign; null to unassign
    permanent_assignee = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )

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
            'permanent_assignee',           # writable (user ID in, null to clear)
            'permanent_assignee_username',   # read-only display
            'permanent_assignee_full_name',  # read-only display
        ]
        read_only_fields = [
            'is_booked', 'is_locked', 'locked_by', 'room_name',
        ]

    def get_permanent_assignee_full_name(self, obj):
        if obj.permanent_assignee:
            return f"{obj.permanent_assignee.first_name} {obj.permanent_assignee.last_name}".strip() or obj.permanent_assignee.username
        return None

    def validate(self, data):
        is_permanent = data.get('is_permanent', getattr(self.instance, 'is_permanent', False))
        permanent_assignee = data.get('permanent_assignee', getattr(self.instance, 'permanent_assignee', None))

        if is_permanent and not permanent_assignee:
            raise serializers.ValidationError({
                'permanent_assignee': 'A permanent desk must have an assignee.'
            })

        if not is_permanent and permanent_assignee:
            raise serializers.ValidationError({
                'permanent_assignee': 'Only permanent desks can have an assignee.'
            })

        return data