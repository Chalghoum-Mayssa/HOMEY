import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ROLE_LABELS } from '../../core/models/user';
import { applyServerErrors, extractError } from '../../core/utils/api-error';
import { AuthService } from '../../core/services/auth.service';

/** US1.5 — Gérer son profil  +  US1.4 — Modifier son mot de passe. */
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private fb = inject(FormBuilder);
  auth = inject(AuthService);
  roleLabels = ROLE_LABELS;

  user = this.auth.user;
  tab = signal<'infos' | 'security'>('infos');
  avatarPreview = signal<string | null>(null);
  avatarSrc = computed(() => this.avatarPreview() ?? this.user()?.avatar ?? null);

  // --- AJOUT POUR LE MENU SANDWICH ---
  isMenuOpen = signal(false);
  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }
  // ----------------------------------

  profileMsg = signal('');
  profileErr = signal('');
  pwdMsg = signal('');
  pwdErr = signal('');
  showPwd = signal(false);

  completion = computed(() => {
    const u = this.user();
    return [
      { label: 'Prénom', ok: !!u?.first_name },
      { label: 'Nom', ok: !!u?.last_name },
      { label: 'Téléphone', ok: !!u?.phone },
      { label: 'Photo', ok: !!this.avatarSrc() },
    ];
  });
  completed = computed(() => this.completion().filter((c) => c.ok).length);

  initials = computed(() => {
    const u = this.user();
    return ((u?.first_name?.[0] ?? '') + (u?.last_name?.[0] ?? '')).toUpperCase() || '?';
  });

  memberSince = computed(() => {
    const d = this.user()?.date_joined;
    return d ? new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
  });

  profileForm = this.fb.nonNullable.group({
    first_name: [this.auth.user()?.first_name ?? '', Validators.required],
    last_name: [this.auth.user()?.last_name ?? '', Validators.required],
    phone: [this.auth.user()?.phone ?? ''],
  });

  pwdForm = this.fb.nonNullable.group({
    old_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.avatarPreview.set(URL.createObjectURL(file));
    const data = new FormData();
    data.append('avatar', file);
    this.profileMsg.set('');
    this.profileErr.set('');
    this.auth.updateProfile(data).subscribe({
      next: () => { this.avatarPreview.set(null); this.profileMsg.set('Photo mise à jour.'); },
      error: (err) => { this.avatarPreview.set(null); this.profileErr.set(extractError(err)); },
    });
    input.value = '';
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const data = new FormData();
    Object.entries(this.profileForm.getRawValue()).forEach(([k, v]) => data.append(k, v));
    this.profileMsg.set('');
    this.profileErr.set('');
    this.auth.updateProfile(data).subscribe({
      next: () => this.profileMsg.set('Profil mis à jour.'),
      error: (err) => { applyServerErrors(this.profileForm, err); this.profileErr.set(extractError(err)); },
    });
  }

  changePassword(): void {
    if (this.pwdForm.invalid) {
      this.pwdForm.markAllAsTouched();
      return;
    }
    const { old_password, new_password } = this.pwdForm.getRawValue();
    this.pwdMsg.set('');
    this.pwdErr.set('');
    this.auth.changePassword(old_password, new_password).subscribe({
      next: () => { this.pwdMsg.set('Mot de passe modifié.'); this.pwdForm.reset(); },
      error: (err) => this.pwdErr.set(extractError(err)),
    });
  }
}