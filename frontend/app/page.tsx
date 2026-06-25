export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getServerSession, getBackendUserId } from "@/lib/server-session";
import { getCurrentUser } from "@/lib/server-currentUser";

/**
 * Root route — server-side redirect based on session + backend state.
 *
 *   no session       -> /login
 *   no location yet  -> /select-location
 *   user role        -> /registrer
 *   admin/superadmin -> /oversikt
 *
 * Role and location come from the backend (`/me`), not the session.
 */
export default async function Home() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  const currentUser = await getCurrentUser(getBackendUserId(session.user));
  if (!currentUser?.preferredLocationId) {
    redirect("/select-location");
  }
  if (currentUser.role === "admin" || currentUser.role === "superadmin") {
    redirect("/oversikt");
  }
  redirect("/registrer");
}
