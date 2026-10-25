from rest_framework.permissions import BasePermission

from .models import User


class HasRole(BasePermission):
    """Base : autorise uniquement les utilisateurs connectés ayant le rôle `required_role`."""

    required_role = None

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == self.required_role)


class IsAdminRole(HasRole):
    required_role = User.Role.ADMIN      # US1.7 : fonctions d'administration


class IsOwnerRole(HasRole):
    required_role = User.Role.OWNER      # sera utilisé pour les annonces (EPIC 2)


class IsTenantRole(HasRole):
    required_role = User.Role.TENANT     # sera utilisé pour recherche / colocation
