from django.db.models.signals import post_save, post_delete 
from django.dispatch import receiver 
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Booking
from serializers.booking import BookingSerializer

@receiver ([post_save, post_delete], sender=Booking)
def broadcast_desk_update(sender, instance, **kwargs):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)( # type: ignore
        "desks",
        {
            "type": "desk_update",
            "data": BookingSerializer(instance).data
        }
    )