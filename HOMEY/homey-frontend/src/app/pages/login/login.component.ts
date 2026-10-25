import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { extractError } from '../../core/utils/api-error';
import { AuthService } from '../../core/services/auth.service';
import { AuthLayoutComponent } from '../../shared/auth-layout/auth-layout.component';

/** Page de connexion. Réutilisée pour l'espace administrateur via data: { admin: true }. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isAdmin = !!this.route.snapshot.data['admin'];
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');
  info = signal(this.initialInfo());

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password, remember } = this.form.getRawValue();
    const request$ = this.isAdmin
      ? this.auth.adminLogin(email, password, remember)
      : this.auth.login(email, password, remember);

    request$.subscribe({
      next: (user) => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl ?? this.auth.homeFor(user));
      },
      error: (err) => {
        this.error.set(extractError(err));
        this.loading.set(false);
      },
    });
  }

  /** Les boutons Google / Apple sont l'habillage visuel : l'OAuth sera ajouté plus tard. */
  socialLogin(provider: string): void {
    this.info.set(`Connexion avec ${provider} : bientôt disponible.`);
  }

  private initialInfo(): string {
    const q = this.route.snapshot.queryParamMap;
    if (q.get('registered')) return 'Compte créé avec succès. Vous pouvez vous connecter.';
    if (q.get('reset')) return 'Mot de passe modifié. Connectez-vous avec le nouveau.';
    return '';
  }
}
