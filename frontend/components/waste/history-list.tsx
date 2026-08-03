"use client";

import { useWasteRegistrations } from "@/hooks/use-waste-registrations";
import { useReports } from "@/hooks/use-reports";
import { ClipboardList, Lock } from "lucide-react";
import { dateToQuarter, quarterLabel } from "@/lib/quarters";
import { HistorySkeleton } from "@/components/waste/history-skeleton";
import { HistoryItem } from "@/components/waste/history-item";

export function HistoryList() {
  const { registrations: allRegistrations, isLoading } =
    useWasteRegistrations();
  const { isPeriodLocked } = useReports();

  if (isLoading) {
    return <HistorySkeleton />;
  }

  const registrations = allRegistrations.filter(
    (r) => r.entries.reduce((s, e) => s + e.weightKg, 0) > 0,
  );

  if (registrations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <ClipboardList className="size-10 opacity-30" />
        <p className="text-sm">Ingen registreringer ennå.</p>
        <p className="text-xs">
          Start ved å registrere avfall for dagens dato.
        </p>
      </div>
    );
  }

  // Group by quarter
  const groups: Record<string, typeof registrations> = {};
  for (const r of registrations) {
    const q = dateToQuarter(r.date);
    (groups[q] ||= []).push(r);
  }
  const quarters = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-0 pb-4">
      <div className="px-1 pb-3">
        <h1 className="text-[30px] font-bold tracking-tight leading-none">
          Historikk
        </h1>
        <div className="text-[13.5px] text-muted-foreground mt-1">
          {registrations.length} registreringer
        </div>
      </div>

      {quarters.map((q) => {
        const locked = isPeriodLocked(q);
        const items = groups[q].sort((a, b) => b.date.localeCompare(a.date));
        const quarterTotal = items.reduce(
          (s, r) => s + r.entries.reduce((x, e) => x + e.weightKg, 0),
          0,
        );

        return (
          <div key={q} className="mb-4">
            {/* Quarter header */}
            <div className="flex items-center gap-2 px-1 pb-2.5">
              <span className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                {quarterLabel(q)}
              </span>
              {locked && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-secondary text-primary uppercase tracking-wide">
                  <Lock className="size-2.5" /> Innlevert
                </span>
              )}
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {quarterTotal.toFixed(1)} kg
              </span>
            </div>

            {/* Registration cards */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {items.map((r, i) => (
                <HistoryItem
                  key={r.id}
                  registration={r}
                  isLast={i === items.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
