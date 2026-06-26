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
import { backendFetch, backendServiceFetch } from "@/lib/server-api";
import { getPool } from "@/lib/auth";
import type { SsoResolveResponse } from "@/lib/auth";

export type Role = "user" | "admin" | "superadmin";
export type CurrentUserLocation = { id: string; name: string };

export type CurrentUser = {
  backendUserId: string;
  role: Role;
  locations: CurrentUserLocation[];
  preferredLocationId: string | null;
  name: string | null;
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
        name: typeof data.name === "string" ? data.name : null,
      };
    } catch {
      return null;
    }
  },
);

/**
 * Lazy re-resolution for SSO users that were `pending` at first sign-in.
 *
 * The Better Auth `user.create.before` hook only fires ONCE. If the user
 * tried to sign in before a superadmin provisioned them, their BA row has
 * `backendUserId = NULL` permanently — until we retry. This helper re-asks
 * the backend and, on success, writes the id into the BA `"user"` table so
 * subsequent requests see it on the session.
 *
 * Called from `/select-location` before deciding to show the
 * "awaiting approval" notice.
 */
export async function resolveAndPersistBackendUserId(input: {
  baUserId: string;
  email: string;
  name: string | null;
}): Promise<string | null> {
  try {
    const resp = await backendServiceFetch("/auth/sso-resolve", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        name: input.name ?? undefined,
      }),
    });
    if (!resp.ok) return null;
    const body = (await resp.json()) as SsoResolveResponse;
    if (body.status !== "resolved") return null;

    await getPool().query(
      'UPDATE "user" SET "backendUserId" = $1 WHERE id = $2',
      [body.backendUserId, input.baUserId],
    );
    return body.backendUserId;
  } catch {
    return null;
  }
}
