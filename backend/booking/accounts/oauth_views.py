from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
import secrets

from ..models_social import SocialAccount


class GoogleLoginView(APIView):
    """
    Initiate Google OAuth login
    Returns the Google OAuth URL for frontend to redirect to
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Generate a random state token for CSRF protection
        state = secrets.token_urlsafe(32)
        request.session['oauth_state'] = state
        
        # Build Google OAuth URL
        google_auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.GOOGLE_OAUTH_CLIENT_ID}&"
            f"redirect_uri={settings.GOOGLE_OAUTH_REDIRECT_URI}&"
            f"response_type=code&"
            f"scope=openid email profile&"
            f"state={state}"
        )
        
        return Response({
            'auth_url': google_auth_url,
            'state': state
        })


class GoogleCallbackView(APIView):
    """
    Handle Google OAuth callback
    Exchange authorization code for tokens and create/login user
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Get the ID token from frontend
        token = request.data.get('credential')
        
        if not token:
            return Response(
                {'error': 'No credential provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                settings.GOOGLE_OAUTH_CLIENT_ID,
                clock_skew_in_seconds=30
            )
            
            # Extract user info
            google_user_id = idinfo.get('sub')
            email = idinfo.get('email')
            given_name = idinfo.get('given_name', '')
            family_name = idinfo.get('family_name', '')
            picture = idinfo.get('picture', '')
            
            if not email or not google_user_id:
                return Response(
                    {'error': 'Email or user ID not provided by Google'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if social account already exists
            social_account = SocialAccount.objects.filter(
                provider='google',
                provider_user_id=google_user_id
            ).first()
            
            if social_account:
                # Existing Google account - just log in
                user = social_account.user
                # Update last login
                social_account.save()
            else:
                # New Google account - check if email exists
                user = User.objects.filter(email=email).first()
                
                if user:
                    # Email exists - link accounts
                    SocialAccount.objects.create(
                        user=user,
                        provider='google',
                        provider_user_id=google_user_id,
                        email=email,
                        first_name=given_name,
                        last_name=family_name,
                        picture_url=picture
                    )
                else:
                    # Create new user
                    username = email.split('@')[0]
                    # Ensure unique username
                    base_username = username
                    counter = 1
                    while User.objects.filter(username=username).exists():
                        username = f"{base_username}{counter}"
                        counter += 1
                    
                    user = User.objects.create(
                        username=username,
                        email=email,
                        first_name=given_name,
                        last_name=family_name,
                    )
                    
                    # Explicitly set unusable password for OAuth-only users
                    user.set_unusable_password()
                    user.save()
                    
                    # Create social account link
                    SocialAccount.objects.create(
                        user=user,
                        provider='google',
                        provider_user_id=google_user_id,
                        email=email,
                        first_name=given_name,
                        last_name=family_name,
                        picture_url=picture
                    )
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Build response
            response = Response({
                'message': 'Login successful',
                'user': {
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'is_location_manager': user.managed_locations.exists(),
                    'is_room_manager': user.managed_rooms.exists(),
                    'is_any_manager': user.managed_locations.exists() or user.managed_rooms.exists(),
                    'role': 'Superuser' if user.is_superuser else ('Staff' if user.is_staff else 'User'),
                    'groups': [g.name for g in user.groups.all()],
                }
            }, status=status.HTTP_200_OK)
            
            # Set HTTP-only cookies
            response.set_cookie(
                key='access_token',
                value=access_token,
                httponly=True,
                secure=True,
                samesite='Strict',
                max_age=60 * 5
            )
            
            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                httponly=True,
                secure=True,
                samesite='Strict',
                max_age=60 * 60 * 24
            )
            
            return response
            
        except ValueError as e:
            return Response(
                {'error': f'Invalid token: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Authentication failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LinkedAccountsView(APIView):
    """
    Get list of linked social accounts for current user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        social_accounts = SocialAccount.objects.filter(user=request.user)
        
        accounts = []
        for account in social_accounts:
            accounts.append({
                'id': account.id,
                'provider': account.provider,
                'email': account.email,
                'picture_url': account.picture_url,
                'created_at': account.created_at,
                'last_login': account.last_login,
            })
        
        # Check if user has a password set
        user = request.user
        has_password = user.has_usable_password()
        
        # Debug logging
        print(f"DEBUG LinkedAccounts:")
        print(f"  Username: {user.username}")
        print(f"  Password field: '{user.password}'")
        print(f"  Password length: {len(user.password)}")
        print(f"  has_usable_password(): {has_password}")
        print(f"  Number of social accounts: {len(accounts)}")
        
        return Response({
            'linked_accounts': accounts,
            'has_password': has_password,
            'can_unlink': has_password or len(accounts) > 1,  # Can unlink if has password OR multiple accounts
        })


class DisconnectSocialAccountView(APIView):
    """
    Disconnect/unlink a social account from user
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, provider):
        user = request.user
        
        # Get the social account
        try:
            social_account = SocialAccount.objects.get(
                user=user,
                provider=provider
            )
        except SocialAccount.DoesNotExist:
            return Response(
                {'error': f'{provider.title()} account not linked'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user has another way to log in
        has_password = user.has_usable_password()
        other_accounts = SocialAccount.objects.filter(user=user).exclude(id=social_account.id).exists()
        
        # Debug logging
        print(f"DEBUG Disconnect: user={user.username}, has_password={has_password}, other_accounts={other_accounts}")
        print(f"DEBUG User password: {user.password[:20] if user.password else 'None'}...")
        
        if not has_password and not other_accounts:
            return Response(
                {
                    'error': 'Cannot disconnect your only login method',
                    'message': 'Please set a password first or link another account before disconnecting.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete the social account
        provider_name = social_account.provider
        social_account.delete()
        
        return Response({
            'message': f'{provider_name.title()} account disconnected successfully',
            'provider': provider_name
        })


class SetPasswordAfterOAuthView(APIView):
    """
    Allow OAuth users to set a password
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        new_password = request.data.get('password')
        
        if not new_password:
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set the password
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': 'Password set successfully',
            'has_password': True
        })