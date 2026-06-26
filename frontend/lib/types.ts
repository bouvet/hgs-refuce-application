export type WasteCategory = {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  accent?: string;
};

export type WasteCategoryEntry = {
  categoryId: string;
  weightKg: number;
};

export type WasteRegistration = {
  id: string;
  date: string; // "YYYY-MM-DD"
  entries: WasteCategoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type Report = {
  id: string;
  period: string; // "YYYY-Qn"
  submittedAt: string;
  submittedBy: string;
};

export type UserRole = "user" | "admin" | "superadmin";

export type Location = {
  id: string;
  name: string;
  createdAt: string;
};

/**
 * Client-side view of the signed-in user, seeded by the server from the backend
 * `/currentUser` response — see `components/providers/session-provider.tsx` and
 * `hooks/use-current-user.ts`.
 *
 * `id` here is the BACKEND user id (the FastAPI primary key), not the
 * Better Auth uuid. Consumers that pass `user.id` to API calls or store it
 * as `createdBy` always mean the backend id. The active location is exposed
 * separately as `locationId` (not on this type).
 */
export type User = {
  id: string;
  name: string;
  role: UserRole;
};

export type AdminUser = {
  id: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

/**
 * A pending SSO access request — created when an unknown Entra user
 * successfully signs in to Better Auth but has no row in the backend
 * `users` table. Superadmins approve or dismiss these from the admin
 * panel.
 */
export type PendingAccessRequest = {
  email: string;
  name: string | null;
  requestedAt: string;
  lastAttemptAt: string;
};

/**
 * Payload for `POST /users`. The backend enforces:
 *   - `password` set ⇒ PIN user, `id` must not contain `@`, password ≥ 4 chars.
 *   - `password` unset ⇒ SSO user, `id` must contain `@`.
 */
export type CreateUserPayload = {
  id: string;
  isAdmin: boolean;
  password?: string;
  name?: string;
};
