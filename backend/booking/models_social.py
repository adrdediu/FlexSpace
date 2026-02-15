from django.db import models
from django.contrib.auth.models import User


class SocialAccount(models.Model):
    """
    Track social authentication providers linked to user accounts
    """
    PROVIDER_CHOICES = [
        ('google', 'Google'),
        ('microsoft', 'Microsoft'),
        ('github', 'GitHub'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='social_accounts')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    provider_user_id = models.CharField(max_length=255, help_text='User ID from the provider')
    email = models.EmailField()
    
    # Profile data
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    picture_url = models.URLField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('provider', 'provider_user_id')
        indexes = [
            models.Index(fields=['user', 'provider']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.provider}"