import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from booking.middleware import JwtAuthMiddleware
import booking.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_project.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JwtAuthMiddleware(
        AuthMiddlewareStack(
            URLRouter(
                booking.routing.websocket_urlpatters
            )
        )
    )
})