import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginResponse, RegisterPayload, User } from '../models/user';

const ACCESS_KEY = 'homey_access';
const REFRESH_KEY = 'homey_refresh';
const USER_KEY = 'homey_user';

/**
 * Service central d'authentification : appels API + état de la session.
 * Les jetons sont gardés dans localStorage (« Se souvenir de moi »)
 * ou sessionStorage (session fermée avec l'onglet).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = `${environment.apiUrl}/auth`;

  /** true si la session est mémorisée durablement (localStorage). */
  private persistent = localStorage.getItem(REFRESH_KEY) !== null;

  /** Utilisateur connecté (signal : l'interface se met à jour automatiquement). */
  private _user = signal<User | null>(this.readStoredUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  private get storage(): Storage {
    return this.persistent ? localStorage : sessionStorage;
  }
  get accessToken(): string | null { return this.storage.getItem(ACCESS_KEY); }
  get refreshToken(): string | null { return this.storage.getItem(REFRESH_KEY); }

  // ------------------------------------------------------------------ API

  /** US1.1 — Inscription locataire / propriétaire. */
  register(payload: RegisterPayload): Observable<unknown> {
    return this.http.post(`${this.api}/register/`, payload);
  }

  /** US1.2 — Connexion locataire / propriétaire. */
  login(email: string, password: string, remember: boolean): Observable<User> {
    return this.http
      .post<LoginResponse>(`${this.api}/login/`, { email, password })
      .pipe(map((res) => this.startSession(res, remember)));
  }

  /** US1.7 — Connexion de l'espace administrateur (endpoint séparé). */
  adminLogin(email: string, password: string, remember: boolean): Observable<User> {
    return this.http
      .post<LoginResponse>(`${this.api}/admin/login/`, { email, password })
      .pipe(map((res) => this.startSession(res, remember)));
  }

  /** US1.2 — Déconnexion : invalide le refresh token côté serveur puis vide la session. */
  logout(): void {
    const refresh = this.refreshToken;
    if (refresh) {
      // On prévient le serveur, mais on déconnecte l'utilisateur quoi qu'il arrive.
      this.http.post(`${this.api}/logout/`, { refresh }).subscribe({ error: () => {} });
    }
    this.clearSession();
  }

  /** Vide la session locale et renvoie vers la page de connexion. */
  clearSession(): void {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(ACCESS_KEY);
      store.removeItem(REFRESH_KEY);
      store.removeItem(USER_KEY);
    }
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  /** US1.5 — Mise à jour du profil (FormData pour pouvoir envoyer l'avatar). */
  updateProfile(data: FormData): Observable<User> {
    return this.http.patch<User>(`${this.api}/me/`, data).pipe(
      tap((user) => {
        this.storage.setItem(USER_KEY, JSON.stringify(user));
        this._user.set(user);
      }),
    );
  }

  /** US1.4 — Modifier son mot de passe. */
  changePassword(old_password: string, new_password: string): Observable<unknown> {
    return this.http.post(`${this.api}/password/change/`, { old_password, new_password });
  }

  /** US1.3 — Demander l'e-mail de réinitialisation. */
  requestPasswordReset(email: string): Observable<unknown> {
    return this.http.post(`${this.api}/password/reset/`, { email });
  }

  /** US1.3 — Enregistrer le nouveau mot de passe (uid + token viennent du lien reçu par e-mail). */
  confirmPasswordReset(uid: string, token: string, new_password: string): Observable<unknown> {
    return this.http.post(`${this.api}/password/reset/confirm/`, { uid, token, new_password });
  }

  // ------------------------------------------------------- Renouvellement JWT

  private refresh$?: Observable<string>;

  /**
   * Obtient un nouveau access token avec le refresh token.
   * Si plusieurs requêtes échouent en même temps, un seul appel est fait (shareReplay).
   */
  refreshAccessToken(): Observable<string> {
    if (!this.refresh$) {
      this.refresh$ = this.http
        .post<{ access: string; refresh?: string }>(`${this.api}/token/refresh/`, { refresh: this.refreshToken })
        .pipe(
          tap((res) => {
            this.storage.setItem(ACCESS_KEY, res.access);
            if (res.refresh) this.storage.setItem(REFRESH_KEY, res.refresh); // rotation activée côté Django
          }),
          map((res) => res.access),
          finalize(() => (this.refresh$ = undefined)),
          shareReplay(1),
        );
    }
    return this.refresh$;
  }

  // --------------------------------------------------------------- Utilitaires

  /** Page d'accueil selon le rôle de l'utilisateur. */
  homeFor(user: User): string {
    return user.role === 'ADMIN' ? '/admin/dashboard' : '/home';
  }

  private startSession(res: LoginResponse, remember: boolean): User {
    this.persistent = remember;
    this.storage.setItem(ACCESS_KEY, res.access);
    this.storage.setItem(REFRESH_KEY, res.refresh);
    this.storage.setItem(USER_KEY, JSON.stringify(res.user));
    this._user.set(res.user);
    return res.user;
  }

  private readStoredUser(): User | null {
    const raw = (this.persistent ? localStorage : sessionStorage).getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }
}
