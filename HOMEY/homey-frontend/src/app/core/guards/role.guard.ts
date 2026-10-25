import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models/user';
import { AuthService } from '../services/auth.service';

/**
 * Autorise la route seulement pour certains rôles, définis dans la route :
 *   { path: 'admin/dashboard', canActivate: [authGuard, roleGuard], data: { roles: ['ADMIN'] } }
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed = (route.data['roles'] ?? []) as Role[];
  const user = auth.user();
  if (user && allowed.includes(user.role)) return true;
  return router.createUrlTree([user ? auth.homeFor(user) : '/login']);
};
