"use client";

import { useState, useCallback, useEffect } from "react";
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

  const refresh = useCallback(async () => {
    if (!user?.id || !locationId) return;
    const repo = createWasteRepository(locationId);
    setRegistrations(await repo.getRegistrations());
  }, [user, locationId]);

  const saveRegistration = useCallback(
    async (reg: WasteRegistration) => {
      if (!user?.id || !locationId) return;
      const repo = createWasteRepository(locationId);
      await repo.saveRegistration(reg);
      await refresh();
    },
    [refresh, user, locationId],
  );

  const deleteRegistration = useCallback(
    async (id: string) => {
      if (!user?.id || !locationId) return;
      const repo = createWasteRepository(locationId);
      await repo.deleteRegistration(id);
      await refresh();
    },
    [refresh, user, locationId],
  );

  return { registrations, saveRegistration, deleteRegistration, refresh };
}
