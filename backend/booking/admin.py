from typing import Any
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.http import HttpRequest
from .models import UserPreferences

from .models_preferences import UserPreferences
from .models import Country, Location, Floor, Room, Desk, Booking
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.core.exceptions import ValidationError


User = get_user_model()



# --- Inline admin ---

class LocationInline(admin.TabularInline):
    model = Location
    extra = 1

class FloorInline(admin.TabularInline):
    model = Floor
    extra = 1

class RoomInline(admin.TabularInline):
    model = Room
    extra = 1

class DeskInline(admin.TabularInline):
    model = Desk
    extra = 1
# --- Parent Admins with Inlines ---

@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)
    inlines = [LocationInline]

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('id','name','country')
    list_filter = ('country',)
    search_fields = ('name','country__name')
    inlines = [FloorInline]

@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ('id','name','location')
    list_filter = ('location',)
    search_fields = ('name','location__name')
    inlines = [RoomInline]

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name','floor','map_image')
    list_filter = ('floor',)
    search_fields = ('name','floor__name','floor__location__name')
    inlines = [DeskInline]

@admin.register(Desk)
class DeskAdmin(admin.ModelAdmin):
    list_display = ['name','room','permanent_status','orientation','is_locked']
    list_filter = ['room','is_permanent','orientation','is_locked']
    search_fields = ['name','permanent_assignee__username','room__name']
    autocomplete_fields = ['permanent_assignee','locked_by']

    fieldsets = (
        ('Basic Information', {
            'fields':('room','name','pos_x','pos_y','orientation')
        }),
        ('Permanent Assignment', {
            'fields': ('is_permanent', 'permanent_assignee')
        }),
        ('Booked',{
            'fields': ('is_booked','booked_by'),
            'classes': ('collapse',)
        }),
        ('Locking', {
            'fields': ('is_locked','locked_by'),
            'classes': ('collapse',)
        }),
    )

    def permanent_status(self, obj):
        """ Display permanent status with color"""
        if obj.is_permanent:
            if obj.permanent_assignee:
                username = obj.permanent_assignee.username
            else:
                username = 'No Assignee'
            return format_html(
                '<span style="color:#8b5cf6; font-weight: bold;">✓ {}</span>',
                username
            )
        return mark_safe('<span style="color:#6b7280;">-</span>')
    permanent_status.short_description = 'Permanent Assignment' # type: ignore

    def get_readonly_fields(self, request, obj=None):
        """ Staff can only edit permanent fields"""
        if request.user.is_superuser:
            return []
        
        return ['room','name','pos_x','pos_y','orientation','is_locked','locked_by','is_booked','booked_by']
    
    def has_add_permission(self, request: HttpRequest) -> bool:
        """ Only superusers can add desks """
        return request.user.is_superuser
    
    def has_delete_permission(self,request,obj=None):
        """ Only superusers can delete desks """
        return request.user.is_superuser
    
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['user','desk','start_time','end_time','is_permanent_desk']
    list_filter = ['desk__is_permanent','start_time','desk__room']
    search_fields = ['user__username','desk__name']
    autocomplete_fields = ['user','desk']
    date_hierarchy = 'start_time'

    def is_permanent_desk(self,obj):
        """ Show if booking is for permanent desk"""
        if obj.desk.is_permanent:
            return format_html('<span style="color: #8B5CF6;">✓ Permanent</span>')
        return '-'
    is_permanent_desk.short_description = 'Desk Type' # type: ignore

    def save_model(self,request, obj, form, change):
        """ Validate before saving"""
        try:
            obj.full_clean()
            super().save_model(request, obj, form, change)
        except ValidationError as e:
            messages.error(request, str(e))


# Register your models here.


# =======================
# UserPreferences Admin
# =======================
@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "theme",
        "language",
        "timezone",
        "default_location",
        "default_booking_duration",
        "updated_at",
    )

    list_filter = (
        "theme",
        "language",
        "timezone",
        "date_format",
        "time_format",
    )

    search_fields = (
        "user__username",
        "user__email",
    )

    autocomplete_fields = ("user", "default_location")

    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        ("User", {
            "fields": ("user",)
        }),

        ("Appearance", {
            "fields": ("theme", "language")
        }),

        ("Regional Settings", {
            "fields": ("timezone", "date_format", "time_format")
        }),

        ("Booking Defaults", {
            "fields": ("default_location", "default_booking_duration")
        }),

        ("Timestamps", {
            "fields": ("created_at", "updated_at")
        }),
    )


# =======================
# Inline inside User admin
# =======================
class UserPreferencesInline(admin.StackedInline):
    model = UserPreferences
    can_delete = False
    extra = 0
    autocomplete_fields = ("default_location",)
    readonly_fields = ("created_at", "updated_at")


# Extend default User admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin


class CustomUserAdmin(BaseUserAdmin):
    inlines = [UserPreferencesInline]


# Re-register User with inline
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)