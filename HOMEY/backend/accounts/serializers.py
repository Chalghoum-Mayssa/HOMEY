from django.conf import settings
from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


# --------------------------------------------------------------------------
# Utilisateur (lecture + modification du profil) — US1.5
# --------------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "avatar", "role", "date_joined"]
        # L'e-mail et le rôle ne sont pas modifiables depuis le profil.
        read_only_fields = ["id", "email", "role", "date_joined"]


# --------------------------------------------------------------------------
# Inscription — US1.1
# --------------------------------------------------------------------------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "role", "password", "password_confirm"]

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cette adresse e-mail est déjà utilisée.")
        return value

    def validate_role(self, value):
        # Sécurité : on ne peut JAMAIS s'inscrire comme administrateur depuis le formulaire.
        if value not in (User.Role.TENANT, User.Role.OWNER):
            raise serializers.ValidationError("Le rôle doit être Locataire ou Propriétaire.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Les mots de passe ne correspondent pas."})
        # Applique les règles de AUTH_PASSWORD_VALIDATORS (longueur, mot de passe courant...)
        password_validation.validate_password(attrs["password"], User(**{
            k: v for k, v in attrs.items() if k in ("email", "first_name", "last_name")
        }))
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return User.objects.create_user(**validated_data)


# --------------------------------------------------------------------------
# Connexion (JWT) — US1.2 et US1.7
# --------------------------------------------------------------------------
class LoginSerializer(TokenObtainPairSerializer):
    """Connexion des locataires et propriétaires. Renvoie access + refresh + user."""

    default_error_messages = {"no_active_account": "E-mail ou mot de passe incorrect."}
    allowed_roles = (User.Role.TENANT, User.Role.OWNER)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role  # le rôle est lisible dans le JWT côté Angular
        return token

    def validate(self, attrs):
        data = super().validate(attrs)  # vérifie e-mail + mot de passe
        if self.user.role not in self.allowed_roles:
            # Accès séparé : un admin ne passe pas par ce formulaire (et inversement).
            raise serializers.ValidationError({"detail": "Ce compte n'a pas accès à cet espace."})
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data


class AdminLoginSerializer(LoginSerializer):
    """Connexion de l'espace administrateur (US1.7) : réservée au rôle ADMIN."""

    allowed_roles = (User.Role.ADMIN,)


# --------------------------------------------------------------------------
# Changement de mot de passe (connecté) — US1.4
# --------------------------------------------------------------------------
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Ancien mot de passe incorrect.")
        return value

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value


# --------------------------------------------------------------------------
# Mot de passe oublié — US1.3
# --------------------------------------------------------------------------
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self):
        """Envoie le lien de réinitialisation si le compte existe (sans révéler s'il existe)."""
        email = self.validated_data["email"].lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if not user:
            return
        uid = urlsafe_base64_encode(force_bytes(user.pk))      # identifiant encodé
        token = default_token_generator.make_token(user)         # jeton à usage unique
        link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
        send_mail(
            subject="HOMEY — Réinitialisation de votre mot de passe",
            message=f"Bonjour {user.first_name},\n\nCliquez sur ce lien pour choisir un nouveau mot de passe :\n{link}\n\n"
                    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(attrs["uid"])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError("Lien invalide.")
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("Lien invalide ou expiré.")
        password_validation.validate_password(attrs["new_password"], user)
        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user
