from rest_framework.request import Request
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import Token

class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that supports both:
    - HTTP-only cookies (primary method)
    - Authorization Header (fallback for compatibility)
    """
    def authenticate(self, request: Request):
        raw_token = request.COOKIES.get('access_token')

        if not raw_token:
            header = self.get_header(request)
            if header is None:
                return None
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None
        
        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except AuthenticationFailed:
            return None
        