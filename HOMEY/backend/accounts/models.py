from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Gestionnaire : explique à Django comment créer un utilisateur sans `username`."""

    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # le mot de passe est hashé, jamais stocké en clair
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        # Un superuser est automatiquement un administrateur HOMEY.
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Utilisateur HOMEY : se connecte avec son e-mail et possède un rôle."""

    class Role(models.TextChoices):
        TENANT = "TENANT", "Locataire"
        OWNER = "OWNER", "Propriétaire"
        ADMIN = "ADMIN", "Administrateur"

    username = None  # on supprime le champ username de Django
    email = models.EmailField("adresse e-mail", unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.TENANT)
    phone = models.CharField("téléphone", max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    USERNAME_FIELD = "email"  # l'identifiant de connexion est l'e-mail
    REQUIRED_FIELDS = ["first_name", "last_name"]  # demandés par `createsuperuser`

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
