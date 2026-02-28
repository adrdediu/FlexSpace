from django.db import models
from django.contrib.auth.models import User


class AuditLog(models.Model):
    """
    Immutable audit trail for all booking-related actions.
    Never update or delete these records.
    """

    class Action(models.TextChoices):
        BOOKING_CREATED   = 'booking_created',   'Booking Created'
        BOOKING_CANCELLED = 'booking_cancelled',  'Booking Cancelled'
        BOOKING_UPDATED   = 'booking_updated',    'Booking Updated'
        DESK_LOCKED       = 'desk_locked',        'Desk Locked'
        DESK_UNLOCKED     = 'desk_unlocked',      'Desk Unlocked'
        DESK_ASSIGNED     = 'desk_assigned',      'Desk Permanently Assigned'
        DESK_UNASSIGNED   = 'desk_unassigned',    'Desk Assignment Cleared'
        ROOM_MAINTENANCE  = 'room_maintenance',   'Room Maintenance Toggled'
        USER_LOGIN        = 'user_login',         'User Logged In'
        USER_LOGOUT       = 'user_logout',        'User Logged Out'

    # Who did it
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    username_snapshot = models.CharField(
        max_length=150,
        help_text='Username at time of action, preserved if user is deleted'
    )

    # What they did
    action = models.CharField(max_length=50, choices=Action.choices)

    # What it affected
    target_type = models.CharField(
        max_length=50,
        help_text='e.g. booking, desk, room'
    )
    target_id = models.IntegerField(
        null=True, blank=True,
        help_text='PK of the affected object'
    )
    target_snapshot = models.JSONField(
        default=dict,
        help_text='Snapshot of the object at time of action'
    )

    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['target_type', 'target_id']),
        ]

    def __str__(self):
        return f"{self.username_snapshot} — {self.action} — {self.timestamp:%Y-%m-%d %H:%M}"

    @classmethod
    def log(cls, *, user, action, target_type, target_id=None,
            target_snapshot=None, ip_address=None, notes=''):
        """
        Convenience method to create an audit log entry.

        Usage:
            AuditLog.log(
                user=request.user,
                action=AuditLog.Action.BOOKING_CREATED,
                target_type='booking',
                target_id=booking.id,
                target_snapshot={'desk': desk.name, 'start': str(start), 'end': str(end)},
                ip_address=request.META.get('REMOTE_ADDR'),
            )
        """
        return cls.objects.create(
            user=user,
            username_snapshot=user.username if user else 'system',
            action=action,
            target_type=target_type,
            target_id=target_id,
            target_snapshot=target_snapshot or {},
            ip_address=ip_address,
            notes=notes,
        )