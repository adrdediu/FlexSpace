from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model

from django.conf import settings

User = get_user_model()

@database_sync_to_async
def get_user(user_id):
    try:
        user = User.objects.get(id=user_id)
        if user.is_active:
            return user
        return None
    except User.DoesNotExist:
        return None

def JwtAuthMiddleware(inner):
    """
    Custom JWT Middleware for Django Channels to authenticate
    WebSocket connections using JWT from HTTP-only cookies.
    """
    async def middleware(scope,receive,send):
        scope["user"] = AnonymousUser()

        headers = dict(scope.get("headers",[]))
        cookie_header = headers.get(b"cookie",b"").decode()

        cookies = {}
        if cookie_header:
            for cookie in cookie_header.split("; "):
                if "=" in cookie:
                    key,value = cookie.split("=", 1)
                    cookies[key] = value 

        token_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE','access_token')
        token = cookies.get(token_name)

        if token:
            try:
                validated_token = AccessToken(token)
                user = await get_user(validated_token["user_id"])
                if user and user.is_active:
                    scope["user"] = user
            except (TokenError, KeyError):
                pass
        
        return await inner(scope,receive,send)
    
    return middleware