/** Les trois rôles de la plateforme (identiques au backend Django). */
export type Role = 'TENANT' | 'OWNER' | 'ADMIN';

export const ROLE_LABELS: Record<Role, string> = {
  TENANT: 'Locataire',
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
};

/** Utilisateur renvoyé par l'API (/auth/me/ et /auth/login/). */
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  avatar: string | null;
  role: Role;
  date_joined: string;
}

/** Corps de la requête d'inscription. */
export interface RegisterPayload {
  email: string;
  first_name: string;
  last_name: string;
  role: 'TENANT' | 'OWNER';
  password: string;
  password_confirm: string;
}

/** Réponse de /auth/login/ : deux jetons JWT + l'utilisateur. */
export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}
