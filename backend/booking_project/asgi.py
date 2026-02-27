import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_project.settings')

from django.core.asgi import get_asgi_application

# Initialize Django FIRST before any other imports
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from booking.middleware import JwtAuthMiddleware
import booking.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JwtAuthMiddleware(
        AuthMiddlewareStack(
            URLRouter(
                booking.routing.websocket_urlpatters
            )
        )
    )
})