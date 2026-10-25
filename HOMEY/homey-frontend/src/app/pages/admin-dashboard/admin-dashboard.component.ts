import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

/** Espace réservé à l'administrateur (protégé par authGuard + roleGuard). Contenu : Sprint 3. */
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent {
  auth = inject(AuthService);
}
