"use client";

import type { User } from "@/lib/types";
import { useSessionData } from "@/components/providers/session-provider";

/**
 * Client-side hook returning the current user, role, and active location.
 *
 * Reads from the read-only `SessionProvider`, which the server seeds in
 * `app/(app)/layout.tsx` from the backend `/currentUser` response. `user.id` is the
 * BACKEND user id (the legacy contract downstream components rely on for
 * `createdBy` and admin API calls). Role and location therefore come from the
 * backend (the source of truth), not the Better Auth session.
 *
 * This is for rendering only — it is never the authorization boundary. Server
 * guards (`requireSession` / `requireRole`) are.
 */
export function useCurrentUser(): {
  user: User | null;
  locationId: string | null;
  locationName: string | null;
  isPending: boolean;
} {
  const { user, locationId, locations } = useSessionData();
  const locationName =
    locationId ? (locations.find((l) => l.id === locationId)?.name ?? null) : null;
  // Seeded synchronously by the server layout, so it is never pending.
  return { user, locationId, locationName, isPending: false };
}
