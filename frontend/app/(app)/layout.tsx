export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNav } from "@/components/layout/app-nav";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SessionProvider } from "@/components/providers/session-provider";
import { requireSession, getBackendUserId } from "@/lib/server-session";
import { getCurrentUser } from "@/lib/server-currentUser";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const currentUser = await getCurrentUser(getBackendUserId(session.user));
  // No backend identity, or no location chosen yet → go pick one (that page
  // also handles the "not provisioned" / "no locations" cases).
  if (!currentUser?.preferredLocationId) {
    redirect("/select-location");
  }

  // Seed the read-only client session view from the backend's source of truth.
  const sessionData = {
    user: {
      id: currentUser.backendUserId,
      name:
        session.user.name ?? session.user.email ?? currentUser.backendUserId,
      role: currentUser.role,
    },
    locationId: currentUser.preferredLocationId,
    locations: currentUser.locations,
  };

  return (
    <SessionProvider value={sessionData}>
      <div className="flex min-h-screen">
        {/* Sidebar — visible on lg+ */}
        <AppSidebar />

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Mobile header + nav — hidden on lg+ */}
          <div className="lg:hidden">
            <AppHeader />
            <AppNav />
          </div>
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-7 max-w-7xl w-full">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
