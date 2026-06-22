"use client";

import { useState, useCallback, useEffect } from "react";
import type { Report } from "@/lib/types";
import { createWasteRepository } from "@/lib/data/waste-repository";
import { dateToQuarter } from "@/lib/quarters";
import { useCurrentUser } from "@/hooks/use-current-user";

export function useReports() {
  const { user, locationId } = useCurrentUser();
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (!user?.id || !locationId) return;
    const repo = createWasteRepository(locationId);
    repo.getReports().then(setReports);
  }, [user, locationId]);

  const refreshReports = useCallback(async () => {
    if (!user?.id || !locationId) return;
    const repo = createWasteRepository(locationId);
    setReports(await repo.getReports());
  }, [user, locationId]);

  const submitReport = useCallback(
    async (period: string, submittedBy: string) => {
      if (!user?.id || !locationId) throw new Error("User or location not set");
      const repo = createWasteRepository(locationId);
      const report = await repo.submitReport(period, submittedBy);
      await refreshReports();
      return report;
    },
    [refreshReports, user, locationId],
  );

  const unlockReport = useCallback(
    async (period: string) => {
      if (!user?.id || !locationId) return;
      const repo = createWasteRepository(locationId);
      await repo.unlockReport(period);
      await refreshReports();
    },
    [refreshReports, user, locationId],
  );

  const isPeriodLocked = useCallback(
    (periodOrDate: string) => {
      const quarter = periodOrDate.includes("Q")
        ? periodOrDate
        : dateToQuarter(periodOrDate);
      return reports.some((r) => r.period === quarter);
    },
    [reports],
  );

  return {
    reports,
    refreshReports,
    submitReport,
    unlockReport,
    isPeriodLocked,
  };
}
