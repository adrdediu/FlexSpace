from django.urls import re_path 
from .consumers import GlobalUpdatesConsumer, RoomConsumer

websocket_urlpatters = [
    re_path(r'^ws/global/$', GlobalUpdatesConsumer.as_asgi()), # type: ignore
    re_path(r'^ws/rooms/(?P<room_id>\d+)/$',RoomConsumer.as_asgi()), # type: ignore
]