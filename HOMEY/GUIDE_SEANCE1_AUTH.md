# HOMEY — Séance 1 : Authentification (Django + Angular)

**Sprint 1 · EPIC 1 — Authentification / Profil**

| US | Fonctionnalité | Où dans le code |
|---|---|---|
| US1.1 | Créer un compte Locataire / Propriétaire | `RegisterView` + page `register` |
| US1.2 | Se connecter / se déconnecter | `LoginView`, `LogoutView` + page `login` |
| US1.3 | Réinitialiser le mot de passe (par e-mail) | `PasswordReset*View` + pages `forgot-password`, `reset-password` |
| US1.4 | Modifier son mot de passe | `ChangePasswordView` + page `profile` |
| US1.5 | Gérer son profil | `MeView` + page `profile` |
| US1.7 | Accès administrateur séparé | `AdminLoginView`, `roleGuard`, route `/admin/login` |
| US1.6 | Préférences de logement du locataire | *à faire plus tard (modèle `TenantPreferences`)* |

---

## 1. Comment ça marche (JWT)

```
Angular                                   Django (API)
  │  POST /api/auth/login/ {email, mdp}      │
  │ ───────────────────────────────────────► │ vérifie l'e-mail + mot de passe
  │ ◄─────────────────────────────────────── │ renvoie access (30 min) + refresh (7 j) + user
  │                                          │
  │  GET /api/auth/me/                       │
  │  Authorization: Bearer <access>          │  ← ajouté automatiquement par l'intercepteur
  │ ───────────────────────────────────────► │
  │ ◄── 401 si access expiré                 │
  │  POST /api/auth/token/refresh/ {refresh} │  ← l'intercepteur renouvelle puis rejoue la requête
```

- **access token** : court, envoyé à chaque requête. **refresh token** : long, sert uniquement à obtenir un nouvel access.
- **Logout** : le refresh est mis en *blacklist* côté serveur, il ne peut plus être réutilisé.
- **Rôles** : `TENANT` (locataire), `OWNER` (propriétaire), `ADMIN`. L'inscription publique refuse `ADMIN`.

---

## 2. Backend Django — commandes commentées

```bash
# Crée un environnement virtuel Python : les librairies du projet restent isolées du reste du PC
python -m venv venv

# Active cet environnement (Windows). Sur Mac/Linux : source venv/bin/activate
venv\Scripts\activate

# Installe Django (framework web) + les 4 librairies utilisées dans l'API :
#  - djangorestframework : transforme Django en API REST (JSON)
#  - djangorestframework-simplejwt : authentification par jetons JWT (access/refresh)
#  - django-cors-headers : autorise Angular (port 4200) à appeler l'API (port 8000)
#  - pillow : nécessaire pour le champ ImageField (photo de profil)
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers pillow

# Enregistre la liste exacte des librairies, pour que les 3 membres de l'équipe installent les mêmes versions
pip freeze > requirements.txt

# (Autre PC) installe tout ce qui est listé dans requirements.txt
pip install -r requirements.txt

# Crée le projet Django ; le « . » le place dans le dossier courant. « config » contient settings.py et urls.py
django-admin startproject config .

# Crée l'application « accounts » : elle regroupera tout ce qui touche aux comptes (modèle, API, droits)
python manage.py startapp accounts

# ⚠️ AVANT cette étape : définir AUTH_USER_MODEL = "accounts.User" dans settings.py et écrire models.py.
# Génère le fichier de migration : la description des tables SQL à créer d'après nos modèles Python
python manage.py makemigrations

# Applique les migrations : crée réellement les tables dans la base (db.sqlite3)
python manage.py migrate

# Crée le compte administrateur (e-mail + prénom + nom + mot de passe) — rôle ADMIN automatique
python manage.py createsuperuser

# Lance les tests automatiques de l'authentification (8 tests : inscription, login, logout, reset...)
python manage.py test accounts

# Démarre le serveur de développement sur http://localhost:8000
python manage.py runserver
```

### Fichiers à connaître (`backend/`)

| Fichier | Rôle |
|---|---|
| `config/settings.py` | Réglages : apps installées, `AUTH_USER_MODEL`, durée des JWT, CORS, e-mails. Les ajouts sont marqués `# >>> HOMEY` |
| `config/urls.py` | Branche toutes les routes de `accounts` sous `/api/auth/` |
| `accounts/models.py` | `User` personnalisé : connexion par **e-mail**, champ `role`, téléphone, avatar |
| `accounts/serializers.py` | Validation des données entrantes et mise en forme des réponses JSON |
| `accounts/views.py` | Les endpoints (inscription, login, logout, profil, mots de passe) |
| `accounts/permissions.py` | `IsAdminRole`, `IsOwnerRole`, `IsTenantRole` pour protéger les futures routes |
| `accounts/admin.py` | Affichage des utilisateurs dans `/admin` |
| `accounts/tests.py` | Tests automatiques |

### Endpoints

| Méthode | URL | Accès | Description |
|---|---|---|---|
| POST | `/api/auth/register/` | public | Inscription |
| POST | `/api/auth/login/` | public | Connexion locataire/propriétaire |
| POST | `/api/auth/admin/login/` | public | Connexion administrateur (séparée) |
| POST | `/api/auth/token/refresh/` | public | Nouveau access token |
| POST | `/api/auth/logout/` | connecté | Invalide le refresh token |
| GET / PATCH | `/api/auth/me/` | connecté | Voir / modifier son profil |
| POST | `/api/auth/password/change/` | connecté | Changer son mot de passe |
| POST | `/api/auth/password/reset/` | public | Envoie le lien par e-mail |
| POST | `/api/auth/password/reset/confirm/` | public | Enregistre le nouveau mot de passe |

> En développement, l'e-mail de réinitialisation **s'affiche dans le terminal** du `runserver` (`EMAIL_BACKEND = console`). Copier le lien et l'ouvrir dans le navigateur.

---

## 3. Frontend Angular — commandes commentées

```bash
# Installe l'outil en ligne de commande d'Angular (une seule fois sur le PC). Version 19 utilisée ici
npm install -g @angular/cli@19

# Crée le projet : --routing (système de pages), --style=scss (CSS amélioré), --ssr=false (pas de rendu serveur)
ng new homey-frontend --routing --style=scss --ssr=false

# Se place dans le dossier du projet
cd homey-frontend

# Crée les fichiers environments/ : l'adresse de l'API (localhost:8000 en dev, vraie URL en production)
ng generate environments

# Crée un composant « layout » partagé : fond photo + carte en verre dépoli (utilisé par toutes les pages d'auth)
ng generate component shared/auth-layout --skip-tests --style=none

# Crée les pages (un composant = un écran). --style=none : les styles sont dans styles.scss
ng generate component pages/login --skip-tests --style=none
ng generate component pages/register --skip-tests --style=none
ng generate component pages/forgot-password --skip-tests --style=none
ng generate component pages/reset-password --skip-tests --style=none
ng generate component pages/profile --skip-tests --style=none
ng generate component pages/home --skip-tests --style=none
ng generate component pages/admin-dashboard --skip-tests --style=none

# Crée le service qui contient tous les appels à l'API d'authentification et l'état de la session
ng generate service core/services/auth --skip-tests

# Crée l'intercepteur : code exécuté sur CHAQUE requête HTTP (ajoute le jeton, renouvelle s'il a expiré)
ng generate interceptor core/interceptors/auth --skip-tests

# Crée les guards : protègent les routes (authGuard = connecté ; roleGuard = bon rôle)
ng generate guard core/guards/auth --skip-tests --functional --implements CanActivate
ng generate guard core/guards/role --skip-tests --functional --implements CanActivate

# Crée l'interface TypeScript « User » (forme des données renvoyées par l'API)
ng generate interface core/models/user

# Lance l'application sur http://localhost:4200 (rechargement automatique à chaque modification)
ng serve
```

### Fichiers à connaître (`homey-frontend/src/`)

| Fichier | Rôle |
|---|---|
| `styles.scss` | Tout le thème visuel (champs, boutons, alertes, pastille HOMEY) |
| `index.html` | Charge les polices Playfair Display (titres) et Lora (texte) |
| `app/shared/auth-layout/` | Fond photo, **carte en verre dépoli** (`backdrop-filter: blur`), carte slogan, points du slider |
| `app/pages/*` | Écrans : connexion, inscription, mot de passe oublié/réinitialisé, profil, accueil, admin |
| `app/core/services/auth.service.ts` | Appels API + session (signals, « Se souvenir de moi ») |
| `app/core/interceptors/auth.interceptor.ts` | Ajoute `Authorization: Bearer …` et gère l'expiration du jeton |
| `app/core/guards/*.ts` | Protection des routes par connexion / par rôle |
| `app/app.routes.ts` | Table des URLs |
| `app/app.config.ts` | Active `HttpClient` + l'intercepteur |
| `app/core/utils/api-error.ts` | Transforme les erreurs de l'API en messages affichés dans les formulaires |
| `public/images/auth-bg.jpg` | Image de fond. **Remplacez-la par votre vraie photo** (villa/appartement) |

### Routes

| URL | Page | Protection |
|---|---|---|
| `/login` | Connexion | publique |
| `/register` | Inscription | publique |
| `/forgot-password` | Mot de passe oublié | publique |
| `/reset-password/:uid/:token` | Nouveau mot de passe (lien e-mail) | publique |
| `/admin/login` | Connexion administrateur | publique |
| `/home`, `/profile` | Accueil, profil | `authGuard` |
| `/admin/dashboard` | Tableau de bord admin | `authGuard` + `roleGuard` (ADMIN) |

---

## 4. Scénario de démonstration

1. Terminal 1 : `cd backend` → `python manage.py runserver`
2. Terminal 2 : `cd homey-frontend` → `ng serve` → ouvrir http://localhost:4200
3. **Inscription** (`/register`) en Locataire → redirection vers `/login` avec message de succès.
4. **Connexion** → arrivée sur `/home` ; ouvrir `/profile` et modifier le prénom / ajouter un avatar.
5. **Mot de passe oublié** → copier le lien affiché dans le terminal Django → définir un nouveau mot de passe.
6. **Admin** : `/admin/login` avec le compte `createsuperuser` → `/admin/dashboard`. Un locataire qui tente `/admin/dashboard` est redirigé.
7. Montrer `/admin` (Django) : la liste des utilisateurs avec leur rôle.

---

## 5. Points d'attention / suite

- **Boutons Google / Apple** : présents pour le design, mais **non fonctionnels** (message « bientôt disponible »). L'OAuth pourra être ajouté ensuite (ex. `django-allauth` ou `dj-rest-auth`).
- **Textes en français** : le modèle de l'image est en anglais ; les libellés se modifient directement dans les fichiers `.html`.
- **Nom de marque** : l'image affiche « Serenique » ; remplacé par **HOMEY**.
- **Stockage des jetons** : `localStorage`/`sessionStorage` (simple pour le projet). Les cookies `HttpOnly` seraient plus sûrs en production.
- **Production** : `DEBUG=False`, `SECRET_KEY` en variable d'environnement, HTTPS, vrai serveur SMTP, limitation des tentatives de connexion.
- **Prochaine étape (US1.6)** : modèle de préférences du locataire (budget, ville, type de logement) servant à la recommandation.
