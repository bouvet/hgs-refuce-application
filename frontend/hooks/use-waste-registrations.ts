"use client";

import { useState, useEffect } from "react";
import type { WasteRegistration } from "@/lib/types";
import { createWasteRepository } from "@/lib/data/waste-repository";
import { useCurrentUser } from "@/hooks/use-current-user";

export function useWasteRegistrations() {
  const { user, locationId } = useCurrentUser();
  const [registrations, setRegistrations] = useState<WasteRegistration[]>([]);

  useEffect(() => {
    if (!user?.id || !locationId) return;
    const repo = createWasteRepository(locationId);
    repo.getRegistrations().then(setRegistrations);
  }, [user, locationId]);

  return { registrations };
}
