from django.db import models
from django.contrib.auth.models import User


class UserPreferences(models.Model):
    """
    User preferences for UI customization
    """
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto (System)'),
    ]
    
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('es', 'Español'),
        ('fr', 'Français'),
        ('de', 'Deutsch'),
    ]
    
    TIMEZONE_CHOICES = [
        ('UTC', 'UTC'),
        ('America/New_York', 'Eastern Time (US & Canada)'),
        ('America/Los_Angeles', 'Pacific Time (US & Canada)'),
        ('Europe/London', 'London'),
        ('Europe/Paris', 'Central European Time'),
        ('Asia/Tokyo', 'Tokyo'),
    ]
    
    DATE_FORMAT_CHOICES = [
        ('mdy', 'MM/DD/YYYY'),
        ('dmy', 'DD/MM/YYYY'),
        ('ymd', 'YYYY-MM-DD'),
    ]
    
    TIME_FORMAT_CHOICES = [
        ('12', '12-hour'),
        ('24', '24-hour'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # Appearance
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='auto')
    language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default='en')
    
    # Regional
    timezone = models.CharField(max_length=50, choices=TIMEZONE_CHOICES, default='UTC')
    date_format = models.CharField(max_length=5, choices=DATE_FORMAT_CHOICES, default='mdy')
    time_format = models.CharField(max_length=5, choices=TIME_FORMAT_CHOICES, default='12')
    
    # Booking defaults
    default_location = models.ForeignKey(
        'Location',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users_with_default'
    )
    default_booking_duration = models.IntegerField(default=8, help_text='Default booking duration in hours')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'User preferences'
    
    def __str__(self):
        return f"{self.user.username}'s preferences"