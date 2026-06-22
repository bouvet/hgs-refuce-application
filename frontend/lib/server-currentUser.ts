/**
 * Server-side fetch of the signed-in user's authoritative role + location.
 *
 * The FastAPI backend is the source of truth for role and location — neither is
 * stored on the Better Auth session. This module is the single place that reads
 * them, via the backend `GET /currentUser` endpoint (identified by the signed
 * `backendUserId`). Results are deduped per request with React `cache()`, so
 * many RSCs/guards in one render share a single backend round-trip.
 *
 * Server-only: imports `backendFetch`, which uses `node:crypto`.
 */
import { cache } from "react";
import { backendFetch } from "@/lib/server-api";

export type Role = "user" | "admin" | "superadmin";
export type CurrentUserLocation = { id: string; name: string };

export type CurrentUser = {
  backendUserId: string;
  role: Role;
  locations: CurrentUserLocation[];
  preferredLocationId: string | null;
};

function normaliseRole(role: unknown): Role {
  return role === "admin" || role === "superadmin" ? role : "user";
}

/**
 * Returns the backend's view of the current user, or `null` when there is no
 * backend identity yet (unprovisioned SSO user) or the backend is unreachable.
 */
export const getCurrentUser = cache(
  async (backendUserId: string | null): Promise<CurrentUser | null> => {
    if (!backendUserId) return null;
    try {
      const resp = await backendFetch("/currentUser", {
        method: "GET",
        actAs: backendUserId,
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as Partial<CurrentUser>;
      return {
        backendUserId: data.backendUserId ?? backendUserId,
        role: normaliseRole(data.role),
        locations: Array.isArray(data.locations) ? data.locations : [],
        preferredLocationId: data.preferredLocationId ?? null,
      };
    } catch {
      return null;
    }
  },
);
