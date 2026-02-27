from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .services.desk_lock import read_lock

@shared_task
def startup_sync_desks():
    """
    Run at celery startup: recompute desk booking state and reconcile locks.
    """
    from .models import Desk, Booking
    now = timezone.now()
    channel_layer = get_channel_layer()

    for desk in Desk.objects.all():

        current = Booking.objects.filter(
            desk=desk, start_time__lte=now, end_time__gt=now
        ).select_related('user').first()

        is_booked = bool(current)
        booked_user = current.user if current else None
        booked_user_id = booked_user.id if booked_user else None

        state_changed = (desk.is_booked != is_booked or desk.booked_by_id != booked_user_id)
        if state_changed:
            desk.is_booked = is_booked
            desk.booked_by = booked_user
            desk.save(update_fields=['is_booked', 'booked_by'])

            async_to_sync(channel_layer.group_send)(
                f"room_{desk.room_id}",
                {
                    "type": "desk_status",
                    "desk_id": desk.id,
                    "is_booked": is_booked,
                    "booked_by": booked_user.username if booked_user else None,
                }
            )
        
        if desk.is_locked:
            lock = read_lock(desk.id)
            if not lock:
                desk.is_locked = False
                desk.locked_by = None
                desk.save(update_fields=['is_locked', 'locked_by'])
                async_to_sync(channel_layer.group_send)(
                    f"room_{desk.room_id}",
                    {"type": "desk_lock", "desk_id": desk.id, "locked": False}
                )

@shared_task
def expire_and_activate_bookings():
    """
    Update desk availability when bookings start or expire (within last minute window),
    and reconcile desk lock flags with Redis TTL (clear DB lock if redis key expired)
    """
    from .models import Desk, Booking
    now = timezone.now()
    one_minute_ago = now - timedelta(minutes=1)

    ended_desk_ids = Desk.objects.filter(
        bookings__end_time__gte=one_minute_ago,
        bookings__end_time__lte=now
    ).distinct().values_list('id', flat=True)

    started_desk_ids = Desk.objects.filter(
        bookings__start_time__gte=one_minute_ago,
        bookings__start_time__lte=now
    ).distinct().values_list('id', flat=True)

    all_desk_ids = list(ended_desk_ids) + list(started_desk_ids)
    desks_to_check = Desk.objects.filter(id__in=all_desk_ids)
    channel_layer = get_channel_layer()

    # Refresh is booked for impacted desks
    for desk in desks_to_check:
        current = Booking.objects.filter(
            desk = desk,
            start_time__lte=now,
            end_time__gt = now
        ).select_related('user').first()

        is_booked = bool(current)
        booked_user = current.user if current else None

        if desk.is_booked != is_booked or desk.booked_by_id != (booked_user.id if booked_user else None):
            desk.is_booked = is_booked
            desk.booked_by = booked_user
            desk.save(update_fields=['is_booked', 'booked_by'])

            async_to_sync(channel_layer.group_send)(
                f"room_{desk.room_id}",
                {
                    "type": "desk_status",
                    "desk_id": desk.id,
                    "is_booked": is_booked,
                    "booked_by": booked_user.username if booked_user else None,
                }
            )
    
    # Reconcile desk locks, clear db lock if redis ttl expired
    locked_desks = Desk.objects.filter(is_locked=True)
    for desk in locked_desks:
        lock = None
        try:
            lock = read_lock(desk.id)
        except Exception as e:
            print(f"Lock read error for desk {desk.id}: {e}")
        
        if not lock:
            desk.is_locked = False
            desk.locked_by = None
            desk.save(update_fields=['is_locked', 'locked_by'])
            try:
                async_to_sync(channel_layer.group_send)(
                    f"room_{desk.room_id}",
                    {"type":"desk_lock", "desk_id": desk.id, "locked": False}
                )
            except Exception as e:
                print(f"Failed to broadcast desk unlock: {e}")

@shared_task
def cleanup_expired_tokens():
    """
    Remove expired tokens from the database.
    Thus maintaing an adequate db size
    """
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
    expired_threshold = timezone.now() - timedelta(hours=24)

    BlacklistedToken.objects.filter(
        token__expires_at__lt = expired_threshold
    ).delete()

    deleted_count = OutstandingToken.objects.filter(
        expires_at__lt=expired_threshold
    ).delete()

    return f"Cleaned up {deleted_count[0]} expired tokens."