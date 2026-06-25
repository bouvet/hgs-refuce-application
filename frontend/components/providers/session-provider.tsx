"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

/**
 * READ-ONLY client view of the signed-in user, seeded once by the server in
 * `app/(app)/layout.tsx` from the backend `/currentUser` response. There are no setters:
 * the backend is the source of truth, and mutations go through server actions
 * (e.g. `setCurrentLocation`) followed by `router.refresh()`, which re-runs the
 * layout and re-seeds this value. This deliberately does NOT use localStorage.
 */
export type SessionData = {
  user: User | null;
  locationId: string | null;
  locations: { id: string; name: string }[];
};

const EMPTY: SessionData = { user: null, locationId: null, locations: [] };

const SessionContext = createContext<SessionData>(EMPTY);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionData;
  children: React.ReactNode;
}) {
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSessionData(): SessionData {
  return useContext(SessionContext);
}
