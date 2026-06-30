"use client";

import { useWasteRegistrations } from "@/hooks/use-waste-registrations";
import { useReports } from "@/hooks/use-reports";
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories";
import { ClipboardList, Lock, ChevronRight } from "lucide-react";
import { dateToQuarter, quarterLabel } from "@/lib/quarters";
import { HistorySkeleton } from "@/components/waste/history-skeleton";

function fmtDay(dateStr: string): string {
  const days = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
  const [y, m, d] = dateStr.split("-").map(Number);
  return days[new Date(y, m - 1, d).getDay()];
}

export function HistoryList() {
  const { registrations, isLoading } = useWasteRegistrations();
  const { isPeriodLocked } = useReports();

  if (isLoading) {
    return <HistorySkeleton />;
  }

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
              {items.map((r, i) => {
                const total = r.entries.reduce((s, e) => s + e.weightKg, 0);
                const topEntries = [...r.entries]
                  .filter((e) => e.weightKg > 0)
                  .sort((a, b) => b.weightKg - a.weightKg);
                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2.5 px-3.5 py-3 ${
                      i < items.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex flex-col items-center justify-center shrink-0">
                      <div className="text-[10px] text-primary font-semibold leading-none uppercase">
                        {fmtDay(r.date)}
                      </div>
                      <div className="text-[16px] text-primary font-bold leading-none mt-0.5">
                        {r.date.slice(8, 10)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-foreground">
                        {total.toFixed(1)} kg totalt
                      </div>
                      <div className="flex gap-1 mt-1 overflow-hidden">
                        {topEntries.slice(0, 4).map((e) => {
                          const cat = DEFAULT_WASTE_CATEGORIES.find(
                            (c) => c.id === e.categoryId,
                          );
                          if (!cat) return null;
                          return (
                            <span
                              key={e.categoryId}
                              className="text-[10.5px] px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap"
                              style={{
                                background: cat.accent ?? "var(--muted)",
                                color: cat.color ?? "var(--foreground)",
                              }}
                            >
                              {cat.label.split("/")[0].split("-")[0]}{" "}
                              {e.weightKg.toFixed(1)}
                            </span>
                          );
                        })}
                        {topEntries.length > 4 && (
                          <span className="text-[10.5px] text-muted-foreground px-1 py-0.5">
                            +{topEntries.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
