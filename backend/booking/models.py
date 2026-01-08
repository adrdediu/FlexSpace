from django.db import models
from django.contrib.auth.models import User
from django.utils.timezone import now
from django.core.exceptions import ValidationError

class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name
    

class Location(models.Model):
    name = models.CharField(max_length=100)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name="locations")
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)

    class Meta:
        unique_together = ('name', 'country')
    
    def __str__(self):
        return f"{self.name} - {self.country.name}"
    
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
    map_image = models.ImageField(upload_to='room_maps/', blank=True, null=True)

    class Meta:
        unique_together = ('name', 'floor')

    def __str__(self):
        return f"{self.name} - {self.floor.name}"
    
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
        current = self.bookings.filter(
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
                check=models.Q(is_permanent=False) | models.Q(permanent_assignee__isnull=False),
                name='permanent_desk_must_have_assignee'
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

        if self.desk.is_permanent and self.desk.permanent_assignee != self.user:
            raise ValidationError({
                'desk': f'This desk is permanently assigned to {self.desk.permanent_assignee.username}. Only they can book it.'
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

# Create your models here.
