"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserContext } from "@/lib/user-context";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { useContext } from "react";

export default function DebugPage() {
  const router = useRouter();
  const { setUser } = useCurrentUser();
  const { setLocationId } = useContext(UserContext);

  useEffect(() => {
    async function initDebugMode() {
      try {
        const locations = await api.getMyLocations("sadmin");
        if (locations.length === 0) {
          throw new Error("No locations available for sadmin");
        }

        const u: User = {
          id: "sadmin",
          name: "Super-admin",
          role: "admin",
          isSuperAdmin: true,
        };

        setUser(u);
        setLocationId(locations[0].id);
        localStorage.setItem("boss-app:debug-mode", "true");
        router.replace("/oversikt");
      } catch (error) {
        console.error("Debug mode init failed:", error);
        router.replace("/");
      }
    }

    initDebugMode();
  }, [setUser, setLocationId, router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <p className="text-muted-foreground">Initializing debug mode...</p>
      </div>
    </main>
  );
}
