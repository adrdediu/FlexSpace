from .floor import FloorSerializer
from .country import CountrySerializer
from ..models import Location
from rest_framework import serializers

class LocationSerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    floors = FloorSerializer(many=True, read_only=True)

    class Meta:
        model = Location
        fields= '__all__'