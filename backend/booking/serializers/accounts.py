from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class LoginTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        return token
    
    def validate(self, attrs):
        username = attrs.get("username","").strip()

        attrs["username"] = username

        data = super().validate(attrs)

        data.update({
            "username": self.user.username,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "email": self.user.email,
            "is_staff": self.user.is_staff,
            "is_superuser": self.user.is_superuser,
            "role": "Superuser" if self.user.is_superuser else ("Staff" if self.user.is_staff else "User"),
            "groups": [group.name for group in self.user.groups.all()],
        })

        return data