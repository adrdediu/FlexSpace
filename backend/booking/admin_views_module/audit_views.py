from rest_framework import serializers, viewsets, permissions
from ..models_audit import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'username_snapshot', 'action', 'action_display',
            'target_type', 'target_id', 'target_snapshot',
            'ip_address', 'timestamp', 'notes',
        ]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit log.
    Regular users see only their own logs.
    Staff/superusers can filter by location_id and room_id (stored in snapshot JSON).
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        p = self.request.query_params
        qs = AuditLog.objects.select_related('user')

        # Ownership gate
        if not user.is_staff and not user.is_superuser:
            qs = qs.filter(user=user)

        # Standard filters (available to all)
        if action := p.get('action'):
            qs = qs.filter(action=action)

        if target_type := p.get('target_type'):
            qs = qs.filter(target_type=target_type)

        if start := p.get('start'):
            qs = qs.filter(timestamp__gte=start)

        if end := p.get('end'):
            qs = qs.filter(timestamp__lte=end)

        # Staff-only filters
        if user.is_staff or user.is_superuser:
            if username := p.get('username'):
                qs = qs.filter(username_snapshot__icontains=username)

            if location_id := p.get('location_id'):
                qs = qs.filter(target_snapshot__location_id=location_id)

            if room_id := p.get('room_id'):
                qs = qs.filter(target_snapshot__room_id=room_id)

        return qs