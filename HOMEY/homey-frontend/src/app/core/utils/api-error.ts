import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';

/** DRF renvoie soit "texte", soit ["texte"] : on récupère toujours une chaîne. */
const firstMessage = (value: unknown): string =>
  Array.isArray(value) ? String(value[0]) : String(value);

/** Transforme une erreur HTTP de l'API en message lisible pour l'utilisateur. */
export function extractError(err: unknown): string {
  const e = err as HttpErrorResponse;
  if (e?.status === 0) {
    return 'Impossible de joindre le serveur. Le backend Django est-il lancé ?';
  }
  const body = e?.error;
  if (body && typeof body === 'object') {
    if (body.detail) return firstMessage(body.detail);
    const first = Object.values(body)[0];
    if (first) return firstMessage(first);
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
}

/** Affiche sous chaque champ l'erreur renvoyée par le backend (ex : e-mail déjà utilisé). */
export function applyServerErrors(form: FormGroup, err: unknown): void {
  const body = (err as HttpErrorResponse)?.error;
  if (!body || typeof body !== 'object') return;
  for (const [field, messages] of Object.entries(body)) {
    form.get(field)?.setErrors({ server: firstMessage(messages) });
  }
}
