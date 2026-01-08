from .room import RoomSerializer
from rest_framework import serializers
from ..models import Floor

class FloorSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True,read_only=True)

    class Meta:
        model = Floor
        fields = '__all__'