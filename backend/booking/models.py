from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import now
from django.core.exceptions import ValidationError

# Import UserPreferences model
from .models_preferences import UserPreferences

# Import SocialAccount model
from .models_social import SocialAccount

class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name
    

class UserGroup(models.Model):
    """
    User groups for location-based access control.
    Created by Location Managers to organize users within a location.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    location = models.ForeignKey('Location', on_delete=models.CASCADE, related_name='user_groups')
    members = models.ManyToManyField(User, related_name='location_groups', blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_groups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'location')
        ordering = ['location', 'name']

    def __str__(self):
        return f"{self.name} ({self.location.name})"


class Location(models.Model):
    name = models.CharField(max_length=100)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name="locations")
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)
    
    # Management fields
    location_managers = models.ManyToManyField(
        User,
        related_name='managed_locations',
        blank=True,
        help_text='Users who can manage this location'
    )
    allow_room_managers_to_add_group_members = models.BooleanField(
        default=False,
        help_text='Allow room managers to add members to user groups'
    )

    class Meta:
        unique_together = ('name', 'country')
    
    def __str__(self):
        return f"{self.name} - {self.country.name}"
    
    def is_location_manager(self, user):
        """Check if user is a location manager"""
        return self.location_managers.filter(id=user.id).exists() or user.is_superuser
    
class Floor(models.Model):
    name = models.CharField(max_length=50)
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="floors")

    class Meta:
        unique_together = ('name', 'location')

    def __str__(self):
        return f"{self.name} ({self.location.name})"
    

class Room(models.Model):
    name = models.CharField(max_length=100)
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name="rooms")
    description = models.TextField(blank=True, help_text='Room description and details')
    map_image = models.ImageField(upload_to='room_maps/', blank=True, null=True)
    
    # Management fields
    room_managers = models.ManyToManyField(
        User,
        related_name='managed_rooms',
        blank=True,
        help_text='Users who can manage this room'
    )
    
    # Access control
    allowed_groups = models.ManyToManyField(
        UserGroup,
        related_name='accessible_rooms',
        blank=True,
        help_text='User groups that can book desks in this room'
    )

    # Maintenance — set manually by a room manager
    is_under_maintenance = models.BooleanField(
        default=False,
        help_text='Room is temporarily unavailable for booking'
    )
    maintenance_by_name = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text='Display name of the manager who enabled maintenance mode'
    )

    class Meta:
        unique_together = ('name', 'floor')

    def __str__(self):
        return f"{self.name} - {self.floor.name}"
    
    def is_room_manager(self, user):
        """Check if user is a room manager or location manager"""
        if user.is_superuser:
            return True
        if self.room_managers.filter(id=user.id).exists():
            return True
        # Location managers have room manager privileges
        return self.floor.location.is_location_manager(user)
    
    def can_user_book(self, user):
        """Check if user can book desks in this room"""
        if user.is_superuser or user.is_staff:
            return True
        
        # Check if user is in any allowed group
        if self.allowed_groups.exists():
            user_groups = user.location_groups.filter(location=self.floor.location)
            return self.allowed_groups.filter(id__in=user_groups.values_list('id', flat=True)).exists()
        
        # If no groups set, allow all users
        return True
    
class Desk(models.Model):
    name = models.CharField(max_length=100)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="desks")

    # Occupancy flags
    is_booked = models.BooleanField(default=False)
    booked_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="booked_desks")

    # Booking Mode lock
    is_locked = models.BooleanField(default=False)
    locked_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="locked_desks")

    pos_x = models.FloatField(default=0)
    pos_y = models.FloatField(default=0)

    orientation = models.CharField(
        max_length=10,
        choices=[
            ('top', 'Top'),
            ('bottom', 'Bottom'),
            ('left', 'Left'),
            ('right', 'Right'),
        ],
        default='bottom',
        help_text='Direction where chairs/user faces'
    )

    is_permanent = models.BooleanField(
        default=False,
        help_text='Is this desk permanently assigned to someone?'
    )
    permanent_assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='permanent_desks',
        help_text='User permanently assigned to this desk'
    )

    def clean(self):
        """Validate desk data"""
        super().clean()

        if self.is_permanent and not self.permanent_assignee:
            raise ValidationError({
                'permanent_assignee': 'Permanent desks must have an assignee.'
            })

        if not self.is_permanent and self.permanent_assignee:
            raise ValidationError({
                'permanent_assignee': 'Only permanent desks can have an assignee.'
            })
        
    def refresh_booking_state(self):
        """
        Set is_booked/booked_by based on bookings active at moment 'now'
        """
        current = self.bookings.filter( # type: ignore
            start_time__lte=now(),
            end_time__gte=now()
        ).select_related('user').first()

        self.is_booked = bool(current)
        self.booked_by = current.user if current else None
        self.save(update_fields=['is_booked','booked_by'])
        return self.is_booked
    
    class Meta:
        ordering = ['room','name']
        constraints = [
            models.CheckConstraint(
                condition=models.Q(is_permanent=False) | models.Q(permanent_assignee__isnull=False),
                name="permanent_desk_must_have_assignee",
            )
        ]

    def __str__(self):
        if self.is_permanent and self.permanent_assignee:
            return f"{self.name} (Permanent - {self.permanent_assignee.username})"
        return f"{self.name} ({self.room.name})"
    
class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bookings")
    desk = models.ForeignKey(Desk, on_delete=models.CASCADE, related_name="bookings")
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    class Meta:
        unique_together = ('desk', 'start_time', 'end_time')
    
    def __str__(self):
        return f"{self.desk.name} booked by {self.user.username}"
    
    def clean(self):
        super().clean()

        from django.utils import timezone as _tz
        now = _tz.now()

        if self.start_time and self.start_time < now:
            raise ValidationError({'start_time': 'Booking start time cannot be in the past.'})

        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError({'end_time': 'end_time must be after start_time.'})

        if self.desk.is_permanent and self.desk.permanent_assignee != self.user:
            raise ValidationError({
                'desk': f'This desk is permanently assigned to {self.desk.permanent_assignee.username}. Only they can book it.' # type: ignore
            })

        overlapping = Booking.objects.filter(
            desk=self.desk,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(pk=self.pk)

        if overlapping.exists():
            raise ValidationError({
                'desk': 'This desk is already booked for the selected time period.'
            })
    
    def save(self,*args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)