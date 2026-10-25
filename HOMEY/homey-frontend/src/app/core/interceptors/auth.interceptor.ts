import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/** Routes publiques : on n'y ajoute pas de jeton et on ne tente pas de renouvellement. */
const PUBLIC_URLS = [
  '/auth/login/',
  '/auth/admin/login/',
  '/auth/register/',
  '/auth/token/refresh/',
  '/auth/password/reset',
];

/**
 * Intercepteur appliqué à TOUTES les requêtes HTTP :
 * 1) ajoute « Authorization: Bearer <access> » ;
 * 2) si l'API répond 401 (access expiré), renouvelle le jeton et rejoue la requête une fois ;
 * 3) si le renouvellement échoue, déconnecte l'utilisateur.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isPublic = PUBLIC_URLS.some((url) => req.url.includes(url));

  const withToken = (token: string | null) =>
    token && !isPublic ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withToken(auth.accessToken)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isPublic && auth.refreshToken) {
        return auth.refreshAccessToken().pipe(
          switchMap((token) => next(withToken(token))),
          catchError((refreshErr) => {
            auth.clearSession();
            return throwError(() => refreshErr);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
