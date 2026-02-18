from channels.generic.websocket import AsyncWebsocketConsumer
from channels.exceptions import StopConsumer
import redis.asyncio as aioredis
import json


class GlobalUpdatesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:  # type: ignore
            await self.close(code=4001)
            raise StopConsumer()

        try:
            redis = await aioredis.from_url(
                "redis://127.0.0.1:6378",
                encoding="utf-8",
                decode_responses=True,
            )
            await redis.ping()  # type: ignore
            await redis.close()
        except Exception:
            await self.close(code=1013)
            raise StopConsumer()

        self.user = self.scope["user"]  # type: ignore
        await self.channel_layer.group_add("global_updates", self.channel_name)
        await self.accept()

    async def receive(self, text_data):  # type: ignore
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            pass

    async def global_event(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    async def disconnect(self, close_code: int) -> None:  # type: ignore
        await self.channel_layer.group_discard("global_updates", self.channel_name)


class LocationConsumer(AsyncWebsocketConsumer):
    """
    Location-level WebSocket. Clients connect when they select a location in
    the browser panel. Receives room-level broadcasts (maintenance, availability)
    so the room list stays live without polling.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.location_id = None
        self.location_group_name = None

    async def connect(self):
        if self.scope["user"].is_anonymous:  # type: ignore
            await self.close(code=4001)
            raise StopConsumer()

        self.location_id = self.scope["url_route"]["kwargs"]["location_id"]  # type: ignore
        self.location_group_name = f"location_{self.location_id}"
        await self.channel_layer.group_add(self.location_group_name, self.channel_name)
        await self.accept()

    async def receive(self, text_data):  # type: ignore
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            pass

    async def room_maintenance(self, event):
        """
        Forwarded when a manager toggles maintenance on a room in this location.
        event: { type, room_id, enabled, by }
        """
        await self.send(text_data=json.dumps({
            "type": "room_maintenance",
            "room_id": event.get("room_id"),
            "enabled": event.get("enabled"),
            "by": event.get("by"),
        }))

    async def room_availability(self, event):
        """
        Forwarded when a room's available desk count changes.
        event: { type, room_id, available_desk_count }
        """
        await self.send(text_data=json.dumps({
            "type": "room_availability",
            "room_id": event.get("room_id"),
            "available_desk_count": event.get("available_desk_count"),
        }))

    async def disconnect(self, close_code):  # type: ignore
        if self.location_group_name:
            await self.channel_layer.group_discard(self.location_group_name, self.channel_name)


class RoomConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.room_id = None
        self.room_group_name = None
        self.is_connected = False

    async def connect(self):
        if self.scope["user"].is_anonymous:  # type: ignore
            await self.close(code=4001)
            raise StopConsumer()

        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]  # type: ignore
        self.room_group_name = f"room_{self.room_id}"
        self.user = self.scope["user"]  # type: ignore

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        self.is_connected = True

    async def receive(self, text_data):  # type: ignore
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        if data.get("type") == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def desk_status(self, event):
        """event: { type, desk_id, is_booked, booked_by }"""
        await self.send(text_data=json.dumps({
            "type": "desk_status",
            "desk_id": event.get("desk_id"),
            "is_booked": event.get("is_booked"),
            "booked_by": event.get("booked_by"),
        }))

    async def update_bookings(self, event):
        """event: { type, desk_id, action, bookings, deleted_ids }"""
        await self.send(text_data=json.dumps({
            "type": "update_bookings",
            "desk_id": event.get("desk_id"),
            "action": event.get("action"),
            "bookings": event.get("bookings", []),
            "deleted_ids": event.get("deleted_ids", []),
        }))

    async def desk_lock(self, event):
        """event: { type, desk_id, locked, by }"""
        await self.send(text_data=json.dumps({
            "type": "desk_lock",
            "desk_id": event.get("desk_id"),
            "locked": event.get("locked"),
            "locked_by": event.get("by"),
        }))

    async def room_maintenance(self, event):
        """event: { type, room_id, enabled, by }"""
        await self.send(text_data=json.dumps({
            "type": "room_maintenance",
            "room_id": event.get("room_id"),
            "enabled": event.get("enabled"),
            "by": event.get("by"),
        }))

    async def room_message(self, event):
        """Generic passthrough. event: { type, data }"""
        await self.send(text_data=json.dumps(event.get("data", {})))

    async def disconnect(self, close_code):  # type: ignore
        if self.is_connected and self.room_group_name:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)