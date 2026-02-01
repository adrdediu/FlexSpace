from rest_framework import routers
from django.conf import settings
from django.conf.urls.static import static
from .views import CookieTokenRefreshView,DeskViewSet,BookingViewSet,MeView,UserLoginView,UserLogoutView
from django.urls import path,include
from .views import CountryViewSet, LocationViewSet, FloorViewSet, RoomViewSet, DeskViewSet, BookingViewSet

router = routers.DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'locations',LocationViewSet)
router.register(r'floors',FloorViewSet)
router.register(r'rooms',RoomViewSet)
router.register(r'desks',DeskViewSet)
router.register(r'bookings',BookingViewSet)

urlpatterns = [
    path('auth/login/', UserLoginView.as_view(), name='login'),
    path('auth/logout', UserLogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', CookieTokenRefreshView.as_view(), name='cookie_token_refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('api/',include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)