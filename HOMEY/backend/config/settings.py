"""
Configuration Django du projet HOMEY (backend).
Seules les parties marquées  # >>> HOMEY  ont été ajoutées / modifiées
par rapport au fichier généré par `django-admin startproject`.
"""
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# ⚠️ Clé de développement uniquement. En production : variable d'environnement.
SECRET_KEY = "django-insecure-homey-dev-key-change-me-in-production"
DEBUG = True
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # >>> HOMEY : librairies tierces
    "rest_framework",                          # Création de l'API REST
    "rest_framework_simplejwt",                # Authentification par jetons JWT
    "rest_framework_simplejwt.token_blacklist",  # Permet d'invalider un refresh token (logout)
    "corsheaders",                             # Autorise Angular (localhost:4200) à appeler l'API
    # >>> HOMEY : nos applications
    "accounts",                                # Comptes, authentification, profil (EPIC 1)
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # >>> HOMEY : doit être AVANT CommonMiddleware
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",  # SQLite en dev ; PostgreSQL possible plus tard
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# >>> HOMEY : notre modèle utilisateur personnalisé (email + rôle)
# À définir AVANT la toute première migration.
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# >>> HOMEY : langue et fuseau horaire
LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Tunis"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# >>> HOMEY : fichiers uploadés (avatars, plus tard photos des logements)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# >>> HOMEY : Django REST Framework
REST_FRAMEWORK = {
    # Par défaut, toutes les vues exigent un JWT valide (les vues publiques le précisent).
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
}

# >>> HOMEY : durée de vie des jetons JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),   # jeton court, envoyé à chaque requête
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),      # jeton long, sert à en obtenir un nouveau
    "ROTATE_REFRESH_TOKENS": True,                    # un nouveau refresh à chaque renouvellement
    "BLACKLIST_AFTER_ROTATION": True,                 # l'ancien refresh devient inutilisable
}

# >>> HOMEY : CORS — origine du frontend Angular
CORS_ALLOWED_ORIGINS = ["http://localhost:4200"]

# >>> HOMEY : e-mails (réinitialisation du mot de passe)
# En dev : l'e-mail s'affiche dans le terminal au lieu d'être envoyé.
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "HOMEY <no-reply@homey.tn>"
# URL du frontend, utilisée pour construire le lien de réinitialisation.
FRONTEND_URL = "http://localhost:4200"
