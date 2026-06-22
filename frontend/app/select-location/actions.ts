"use server";

import { redirect } from "next/navigation";
import { requireSession, getBackendUserId } from "@/lib/server-session";
import { backendFetch } from "@/lib/server-api";

/**
 * Persist the chosen location on the FastAPI backend, which is the single
 * source of truth for the user's preferred/active location. Nothing is stored
 * on the Better Auth session — the next request reads it back via `/currentUser`.
 *
 * Called from:
 *   - the server-rendered "single location" branch in select-location/page.tsx
 *   - the LocationPicker server-action submit
 */
export async function setCurrentLocation(locationId: string): Promise<void> {
  const session = await requireSession();
  const backendUserId = getBackendUserId(session.user);
  if (!backendUserId) {
    redirect("/login");
  }

  const resp = await backendFetch("/currentUser/location", {
    method: "PATCH",
    actAs: backendUserId,
    body: JSON.stringify({ locationId }),
  });
  if (!resp.ok) {
    throw new Error("Kunne ikke lagre lokasjon. Prøv igjen.");
  }
}

export async function submitLocation(formData: FormData): Promise<void> {
  const locationId = formData.get("locationId");
  if (typeof locationId !== "string" || !locationId) {
    redirect("/select-location");
  }
  await setCurrentLocation(locationId);
  redirect("/oversikt");
}
