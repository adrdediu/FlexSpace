from rest_framework import serializers

from .desk import DeskSerializer
from ..models import Floor, Room

class BasicFloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    floor = BasicFloorSerializer(read_only=True)
    floor_id = serializers.PrimaryKeyRelatedField(
        queryset=Floor.objects.all(),
        write_only=True,
        source='floor'
    )

    class Meta:
        model = Room
        fields = '__all__'


class RoomWithDesksSerializer(RoomSerializer):
    desks = DeskSerializer(many=True,read_only=True)

    class Meta(RoomSerializer.Meta):
        fields = '__all__'