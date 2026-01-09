from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.exceptions import StopConsumer
import redis.asyncio as aioredis

class GlobalUpdatesConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous: # type: ignore
            await self.close(code=4001)
            raise StopConsumer()
        
        try:
            redis = await aioredis.from_url(
                "redis://127.0.0.1:6378",
                encoding="utf-8",
                decode_responses=True
            )
            await redis.ping() # type: ignore
            await redis.close()

        except Exception as e:
            await self.close(code=1013)
            raise StopConsumer()
        
        self.user = self.scope["user"] # type: ignore

        await self.channel_layer.group_add("global_updates", self.channel_name)
        await self.accept()

    async def receive(self,text_data): # type: ignore
        try:
            data = json.loads(text_data)
            if data.get("type") == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            pass
    
    async def global_event(self, event):
        await self.send(text_data=json.dumps(event["data"]))
    
    async def disconnect(self, close_code: int) -> None: # type: ignore
        await self.channel_layer.group_discard("global_updates", self.channel_name)
        if hasattr(self,"user"):
            pass

class RoomConsumer(AsyncWebsocketConsumer):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        self.user = None
        self.room_id = None
        self.room_group_name= None
        self.is_connected = None
    
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id'] # type: ignore
        self.room_group_name = f'room_{self.room_id}'

        if self.scope["user"].is_anonymous: # type: ignore
            await self.close(code=4001)
            raise StopConsumer()

        self.user = self.scope["user"] # type: ignore

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        self.is_connected = True
    
    async def receive(self,text_data): # type: ignore
        """
        Handle client messages
        """
        try:
            data= json.loads(text_data)
        except json.JSONDecodeError:
            return
        
        msg_type = data.get("type")

        if msg_type == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))
        else:
            pass

    async def desk_status(self, event):
        """
        Broadcast desk status updates
        event: {
            "type": "desk_status",
            "desk_id": int,
            "is_booked": bool,
            "booked_by": str
        }
        """
        await self.send(text_data=json.dumps({
            "type": "desk_status",
            "desk_id": event.get("desk_id"),
            "is_booked": event.get("is_booked"),
            "booked_by": event.get("booked_by"),
        }))
    
    async def update_bookings(self,event):
        """
        Forward booking updates (upserts/deletions) for a desk.
        event: {
            "type": "update_bookings",
            "desk_id": int,
            "action": "upsert" or "delete" or "mixed"
            "bookings": [...],
            "deleted_ids": [int, ...]
        }
        """
        await self.send(text_data=json.dumps({
            "type": "update_bookings",
            "desk_id": event.get("desk_id"),
            "action": event.get("action"),
            "bookings":event.get("bookings",[]),
            "deleted_ids":event.get("deleted_ids",[]),
        }))

    async def desk_lock (self,event):
        """
        Broadcasted when a desk is locked/unlocked.
        event: {
            "type": "desk_lock",
            "desk_id": int,
            "locked": bool,
            "by":str
        }
        """
        await self.send(text_data=json.dumps({
            "type": "desk_lock",
            "desk_id": event.get("desk_id"),
            "locked": event.get ("locked"),
            "locked_by": event.get("by"),
        }))
    
    async def room_message(self,event):
        """  
        Generic room message handler
        event : {
            "type": "room_message",
            "data": {...}
        }
        """
        await self.send(text_data=json.dumps(event.get("data",{})))

    async def disconnect(self, close_code): # type: ignore
        """ 
        Handle Websocket disconnection
        """
        if self.is_connected and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        else:
            pass