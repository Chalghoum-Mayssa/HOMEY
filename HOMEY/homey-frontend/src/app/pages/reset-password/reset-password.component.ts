import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { extractError } from '../../core/utils/api-error';
import { AuthService } from '../../core/services/auth.service';
import { AuthLayoutComponent } from '../../shared/auth-layout/auth-layout.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { new_password, confirm } = group.value;
  return new_password && confirm && new_password !== confirm ? { mismatch: true } : null;
}

/** US1.3 (2/2) — Choix du nouveau mot de passe. L'URL contient uid et token (lien de l'e-mail). */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group(
    {
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const uid = this.route.snapshot.paramMap.get('uid')!;
    const token = this.route.snapshot.paramMap.get('token')!;
    this.loading.set(true);
    this.error.set('');
    this.auth.confirmPasswordReset(uid, token, this.form.getRawValue().new_password).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { reset: 1 } }),
      error: (err) => { this.error.set(extractError(err)); this.loading.set(false); },
    });
  }
}
