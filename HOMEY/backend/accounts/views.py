from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import (
    AdminLoginSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — créer un compte Locataire ou Propriétaire (US1.1)."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]  # public : le visiteur n'est pas encore connecté


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — connexion locataire / propriétaire (US1.2)."""

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]


class AdminLoginView(TokenObtainPairView):
    """POST /api/auth/admin/login/ — connexion séparée pour l'administrateur (US1.7)."""

    serializer_class = AdminLoginSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """POST /api/auth/logout/ — invalide le refresh token (US1.2)."""

    def post(self, request):
        try:
            RefreshToken(request.data.get("refresh")).blacklist()
        except TokenError:
            return Response({"detail": "Jeton invalide."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ — consulter et modifier son profil (US1.5)."""

    serializer_class = UserSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # MultiPart pour l'upload d'avatar

    def get_object(self):
        return self.request.user  # toujours l'utilisateur du token : impossible de modifier un autre profil


class ChangePasswordView(APIView):
    """POST /api/auth/password/change/ — modifier son mot de passe (US1.4)."""

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Mot de passe modifié."})


class PasswordResetRequestView(APIView):
    """POST /api/auth/password/reset/ — demander le lien par e-mail (US1.3)."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Même réponse que le compte existe ou non (évite de deviner les e-mails inscrits).
        return Response({"detail": "Si un compte existe, un e-mail a été envoyé."})


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password/reset/confirm/ — définir le nouveau mot de passe (US1.3)."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Mot de passe réinitialisé."})
