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
        ('America/Chicago', 'Central Time (US & Canada)'),
        ('America/Denver', 'Mountain Time (US & Canada)'),
        ('America/Los_Angeles', 'Pacific Time (US & Canada)'),
        ('America/Phoenix', 'Arizona'),
        ('America/Anchorage', 'Alaska'),
        ('Pacific/Honolulu', 'Hawaii'),
        ('Europe/London', 'London'),
        ('Europe/Paris', 'Paris / Central European Time'),
        ('Europe/Berlin', 'Berlin'),
        ('Europe/Rome', 'Rome'),
        ('Europe/Madrid', 'Madrid'),
        ('Europe/Amsterdam', 'Amsterdam'),
        ('Europe/Brussels', 'Brussels'),
        ('Europe/Vienna', 'Vienna'),
        ('Europe/Stockholm', 'Stockholm'),
        ('Europe/Copenhagen', 'Copenhagen'),
        ('Europe/Athens', 'Athens'),
        ('Europe/Helsinki', 'Helsinki'),
        ('Europe/Dublin', 'Dublin'),
        ('Europe/Lisbon', 'Lisbon'),
        ('Europe/Warsaw', 'Warsaw'),
        ('Europe/Prague', 'Prague'),
        ('Europe/Budapest', 'Budapest'),
        ('Europe/Bucharest', 'Bucharest'),
        ('Asia/Dubai', 'Dubai'),
        ('Asia/Tokyo', 'Tokyo'),
        ('Asia/Shanghai', 'Shanghai'),
        ('Asia/Hong_Kong', 'Hong Kong'),
        ('Asia/Singapore', 'Singapore'),
        ('Asia/Seoul', 'Seoul'),
        ('Asia/Bangkok', 'Bangkok'),
        ('Asia/Mumbai', 'Mumbai'),
        ('Asia/Kolkata', 'Kolkata'),
        ('Asia/Karachi', 'Karachi'),
        ('Asia/Jerusalem', 'Jerusalem'),
        ('Asia/Manila', 'Manila'),
        ('Australia/Sydney', 'Sydney'),
        ('Australia/Melbourne', 'Melbourne'),
        ('Australia/Brisbane', 'Brisbane'),
        ('Australia/Perth', 'Perth'),
        ('Pacific/Auckland', 'Auckland'),
        ('America/Toronto', 'Toronto'),
        ('America/Vancouver', 'Vancouver'),
        ('America/Mexico_City', 'Mexico City'),
        ('America/Sao_Paulo', 'São Paulo'),
        ('America/Buenos_Aires', 'Buenos Aires'),
        ('Africa/Cairo', 'Cairo'),
        ('Africa/Johannesburg', 'Johannesburg'),
        ('Africa/Lagos', 'Lagos'),
        ('Africa/Nairobi', 'Nairobi'),
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