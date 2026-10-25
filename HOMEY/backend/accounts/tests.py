from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User

PWD = "Homey#2026pass"


class AuthFlowTests(APITestCase):
    def setUp(self):
        self.tenant = User.objects.create_user("lina@homey.tn", PWD, first_name="Lina", last_name="B", role="TENANT")
        self.admin = User.objects.create_superuser("admin@homey.tn", PWD, first_name="Ad", last_name="Min")

    def login(self, email="lina@homey.tn", url="/api/auth/login/"):
        return self.client.post(url, {"email": email, "password": PWD})

    def test_register_ok_and_admin_role_refused(self):
        data = {"email": "Sam@Homey.tn", "first_name": "Sam", "last_name": "T", "role": "OWNER",
                "password": PWD, "password_confirm": PWD}
        r = self.client.post("/api/auth/register/", data)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="sam@homey.tn", role="OWNER").exists())
        r = self.client.post("/api/auth/register/", {**data, "email": "x@homey.tn", "role": "ADMIN"})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch_and_duplicate(self):
        data = {"email": "lina@homey.tn", "first_name": "L", "last_name": "B", "role": "TENANT",
                "password": PWD, "password_confirm": PWD}
        self.assertEqual(self.client.post("/api/auth/register/", data).status_code, 400)
        data.update(email="new@homey.tn", password_confirm="autre")
        self.assertEqual(self.client.post("/api/auth/register/", data).status_code, 400)

    def test_login_me_refresh_logout(self):
        r = self.login()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["user"]["role"], "TENANT")
        access, refresh = r.data["access"], r.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(self.client.get("/api/auth/me/").data["email"], "lina@homey.tn")
        r = self.client.patch("/api/auth/me/", {"first_name": "Lina2", "role": "ADMIN"}, format="json")
        self.assertEqual(r.data["first_name"], "Lina2")
        self.assertEqual(r.data["role"], "TENANT")  # le rôle ne peut pas être modifié
        r = self.client.post("/api/auth/token/refresh/", {"refresh": refresh})
        self.assertEqual(r.status_code, 200)
        # l'ancien refresh est blacklisté (rotation) -> on se déconnecte avec le nouveau
        self.assertEqual(self.client.post("/api/auth/token/refresh/", {"refresh": refresh}).status_code, 401)
        self.assertEqual(self.client.post("/api/auth/logout/", {"refresh": r.data["refresh"]}).status_code, 205)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_wrong_password(self):
        r = self.client.post("/api/auth/login/", {"email": "lina@homey.tn", "password": "nope"})
        self.assertEqual(r.status_code, 401)

    def test_separate_admin_access(self):
        self.assertEqual(self.login("admin@homey.tn").status_code, 400)          # admin refusé ici
        self.assertEqual(self.login("lina@homey.tn", "/api/auth/admin/login/").status_code, 400)
        self.assertEqual(self.login("admin@homey.tn", "/api/auth/admin/login/").status_code, 200)

    def test_change_password(self):
        self.client.force_authenticate(self.tenant)
        r = self.client.post("/api/auth/password/change/", {"old_password": "bad", "new_password": "Nouveau#2026x"})
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/auth/password/change/", {"old_password": PWD, "new_password": "Nouveau#2026x"})
        self.assertEqual(r.status_code, 200)

    def test_password_reset_flow(self):
        r = self.client.post("/api/auth/password/reset/", {"email": "lina@homey.tn"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        link = mail.outbox[0].body.split("/reset-password/")[1].split()[0]  # "<uid>/<token>"
        uid, token = link.split("/")
        r = self.client.post("/api/auth/password/reset/confirm/", {"uid": uid, "token": token, "new_password": "Reset#2026abc"})
        self.assertEqual(r.status_code, 200)
        # le lien ne marche qu'une fois
        r = self.client.post("/api/auth/password/reset/confirm/", {"uid": uid, "token": token, "new_password": "Reset#2026abd"})
        self.assertEqual(r.status_code, 400)
        # e-mail inconnu : même réponse, aucun mail
        r = self.client.post("/api/auth/password/reset/", {"email": "inconnu@homey.tn"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
