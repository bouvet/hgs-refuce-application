"use client";

import { useState, useEffect } from "react";
import type { WasteRegistration } from "@/lib/types";
import { createWasteRepository } from "@/lib/data/waste-repository";
import { useCurrentUser } from "@/hooks/use-current-user";

export function useWasteRegistrations() {
  const { user, locationId } = useCurrentUser();
  const [registrations, setRegistrations] = useState<WasteRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !locationId) return;
    const repo = createWasteRepository(locationId);
    let cancelled = false;
    repo
      .getRegistrations()
      .then((data) => {
        if (!cancelled) setRegistrations(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, locationId]);

  return { registrations, isLoading };
}
