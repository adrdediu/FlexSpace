"""
User search views for finding users to add as managers
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import serializers


class UserSearchSerializer(serializers.ModelSerializer):
    """Serializer for user search results"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
    
    def get_full_name(self, obj):
        """Get user's full name"""
        if obj.first_name or obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        return obj.username


class UserSearchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for searching users
    """
    queryset = User.objects.all()
    serializer_class = UserSearchSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Search for users by username, email, first name, or last name
        Query param: ?q=search_term
        """
        query = request.query_params.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response(
                {'error': 'Search query must be at least 2 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Search across multiple fields
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).distinct()[:20]  # Limit to 20 results
        
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)