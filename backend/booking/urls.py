from rest_framework import routers
from django.conf import settings
from django.conf.urls.static import static
from .views import CookieTokenRefreshView,DeskViewSet,BookingViewSet,MeView,UserLoginView,UserLogoutView
from django.urls import path,include
from .views import CountryViewSet, LocationViewSet, FloorViewSet, RoomViewSet, DeskViewSet, BookingViewSet
from .admin_views_module import UserGroupViewSet, LocationManagementViewSet, RoomManagementViewSet, UserSearchViewSet, UserPreferencesViewSet
from .accounts.oauth_views import GoogleLoginView, GoogleCallbackView, LinkedAccountsView, DisconnectSocialAccountView, SetPasswordAfterOAuthView

router = routers.DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'locations',LocationViewSet)
router.register(r'floors',FloorViewSet)
router.register(r'rooms',RoomViewSet)
router.register(r'desks',DeskViewSet)
router.register(r'bookings',BookingViewSet)

# Admin routes
router.register(r'usergroups', UserGroupViewSet, basename='usergroup')
router.register(r'admin/locations', LocationManagementViewSet, basename='admin-location')
router.register(r'admin/rooms', RoomManagementViewSet, basename='admin-room')
router.register(r'users', UserSearchViewSet, basename='user')
router.register(r'preferences', UserPreferencesViewSet, basename='preferences')

urlpatterns = [
    path('auth/login/', UserLoginView.as_view(), name='login'),
    path('auth/logout', UserLogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', CookieTokenRefreshView.as_view(), name='cookie_token_refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    
    # OAuth routes
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),
    path('auth/google/callback/', GoogleCallbackView.as_view(), name='google-callback'),
    path('auth/linked-accounts/', LinkedAccountsView.as_view(), name='linked-accounts'),
    path('auth/disconnect/<str:provider>/', DisconnectSocialAccountView.as_view(), name='disconnect-social'),
    path('auth/set-password/', SetPasswordAfterOAuthView.as_view(), name='set-password'),
    
    path('api/',include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)