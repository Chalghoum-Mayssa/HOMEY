import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { applyServerErrors, extractError } from '../../core/utils/api-error';
import { AuthService } from '../../core/services/auth.service';
import { AuthLayoutComponent } from '../../shared/auth-layout/auth-layout.component';

/** Validateur de groupe : les deux mots de passe doivent être identiques. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, password_confirm } = group.value;
  return password && password_confirm && password !== password_confirm ? { mismatch: true } : null;
}

/** US1.1 — Création d'un compte Locataire ou Propriétaire. */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group(
    {
      role: ['TENANT' as 'TENANT' | 'OWNER', Validators.required],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { registered: 1 } }),
      error: (err) => {
        applyServerErrors(this.form, err); // erreurs sous les champs concernés
        this.error.set(extractError(err));
        this.loading.set(false);
      },
    });
  }

  /** Vrai si le champ est invalide ET déjà visité (pour afficher l'erreur au bon moment). */
  invalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.touched && c.invalid;
  }
}
