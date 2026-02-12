from rest_framework import serializers
from django.contrib.auth.models import User
from booking.models import UserGroup


class UserGroupMemberSerializer(serializers.ModelSerializer):
    """Simplified user serializer for group members"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email']
        read_only_fields = ['id', 'username', 'first_name', 'last_name', 'email']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class UserGroupListSerializer(serializers.ModelSerializer):
    """Serializer for listing user groups"""
    location_name = serializers.CharField(source='location.name', read_only=True)
    member_count = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = UserGroup
        fields = [
            'id', 'name', 'description', 'location', 'location_name',
            'member_count', 'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return obj.members.count()


class UserGroupDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with member information"""
    location_name = serializers.CharField(source='location.name', read_only=True)
    members = UserGroupMemberSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        source='members',
        write_only=True,
        required=False
    )
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = UserGroup
        fields = [
            'id', 'name', 'description', 'location', 'location_name',
            'members', 'member_ids', 'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Set created_by from request user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        members = validated_data.pop('members', [])
        group = UserGroup.objects.create(**validated_data)
        
        if members:
            group.members.set(members)
        
        return group
    
    def update(self, instance, validated_data):
        members = validated_data.pop('members', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if members is not None:
            instance.members.set(members)
        
        return instance


class UserGroupAddMembersSerializer(serializers.Serializer):
    """Serializer for adding members to a group"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        help_text='List of user IDs to add to the group'
    )
    
    def validate_user_ids(self, value):
        if not value:
            raise serializers.ValidationError("At least one user ID is required")
        
        # Verify all users exist
        existing_users = User.objects.filter(id__in=value).values_list('id', flat=True)
        missing_ids = set(value) - set(existing_users)
        
        if missing_ids:
            raise serializers.ValidationError(f"Users not found: {missing_ids}")
        
        return value


class UserGroupRemoveMembersSerializer(serializers.Serializer):
    """Serializer for removing members from a group"""
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        help_text='List of user IDs to remove from the group'
    )
    
    def validate_user_ids(self, value):
        if not value:
            raise serializers.ValidationError("At least one user ID is required")
        return value