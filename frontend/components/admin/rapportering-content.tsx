"use client";

import { useState } from "react";
import { Lock, Download } from "lucide-react";
import { useWasteRegistrations } from "@/hooks/use-waste-registrations";
import { useReports } from "@/hooks/use-reports";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  daysLeftInQuarter,
  dateToQuarter,
  getCurrentQuarter,
  quarterLabelLong,
  quarterYear,
} from "@/lib/quarters";
import { regsInQuarter, totalKg } from "@/lib/waste-utils";
import type { Report } from "@/lib/types";
import { ConfirmDialog, type DialogConfig } from "./confirm-dialog";
import { PeriodCard } from "./rapportering/period-card";
import { YearAccordion } from "./rapportering/year-accordion";

export function RapporteringContent() {
  const { registrations } = useWasteRegistrations();
  const { reports, submitReport, unlockReport } = useReports();
  const { user, locationId } = useCurrentUser();
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const currentPeriod = getCurrentQuarter();
  const currentReport = reports.find((r) => r.period === currentPeriod);
  const currentYear = quarterYear(currentPeriod);

  function reportHtmlUrl(period: string, opts: { preview?: boolean } = {}) {
    if (!locationId) return "#";
    const path = opts.preview ? "preview-html" : "html";
    return `/api/locations/${encodeURIComponent(locationId)}/reports/${encodeURIComponent(period)}/${path}`;
  }

  function openPdf(period: string, opts: { preview?: boolean } = {}) {
    window.open(reportHtmlUrl(period, opts), "_blank", "noopener,noreferrer");
  }

  async function handleConfirm() {
    if (!dialog) return;
    if (dialog.mode === "submit") {
      await submitReport(dialog.period, user?.id ?? "admin");
    } else {
      await unlockReport(dialog.period);
    }
  }

  // ----- derive listing -----
  const lockedPeriods = new Set(reports.map((r) => r.period));

  // Unlocked: always include the current quarter; include any other quarter
  // seen in registrations that is not locked. No fixed-window cap — open
  // periods are expected to be at most 1–2 in practice.
  const unlockedPeriodSet = new Set<string>();
  if (!currentReport) unlockedPeriodSet.add(currentPeriod);
  for (const reg of registrations) {
    const q = dateToQuarter(reg.date);
    if (!lockedPeriods.has(q)) unlockedPeriodSet.add(q);
  }
  const unlockedPeriods = [...unlockedPeriodSet].sort((a, b) =>
    b.localeCompare(a),
  );

  // Locked reports grouped by year, newest year first; quarters desc within.
  const lockedByYear = new Map<number, Report[]>();
  for (const report of reports) {
    const year = quarterYear(report.period);
    const list = lockedByYear.get(year) ?? [];
    list.push(report);
    lockedByYear.set(year, list);
  }
  for (const list of lockedByYear.values()) {
    list.sort((a, b) => b.period.localeCompare(a.period));
  }
  const lockedYears = [...lockedByYear.keys()].sort((a, b) => b - a);

  const dialogRegsCount = dialog
    ? regsInQuarter(registrations, dialog.period).length
    : 0;
  const dialogTotal = dialog
    ? totalKg(regsInQuarter(registrations, dialog.period))
    : 0;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapportering</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send data videre til Miljøfyrtårn ved månedsslutt.
        </p>
      </div>

      {unlockedPeriods.map((period) => {
        const regs = regsInQuarter(registrations, period);
        const regsCount = regs.length;
        const total = totalKg(regs);
        const isCurrent = period === currentPeriod;
        const daysLeft = isCurrent ? daysLeftInQuarter(period) : 0;
        return (
          <div
            key={period}
            className="relative rounded-2xl p-6 overflow-hidden text-white"
            style={{
              background: isCurrent
                ? "linear-gradient(135deg, #3e7a3a 0%, #2d5a2a 100%)"
                : "linear-gradient(135deg, #b45a2d 0%, #7a3d1f 100%)",
            }}
          >
            <div className="absolute -right-10 -top-10 opacity-[0.07] pointer-events-none">
              <svg
                viewBox="0 0 24 24"
                width="220"
                height="220"
                fill="none"
                stroke="white"
                strokeWidth="1"
              >
                <path d="M11 20A7 7 0 0 1 4 13c0-5 5-10 17-10 0 12-5 17-10 17ZM4 20l10-10" />
              </svg>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
              {isCurrent ? "Åpen periode" : "Ikke låst — forfalt"}
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold capitalize tracking-tight">
                {quarterLabelLong(period)}
              </div>
              <div className="text-[13.5px] opacity-85 mt-1">
                {isCurrent ? `${daysLeft} dager igjen · ` : ""}
                {regsCount} registreringer · {total.toFixed(1)} kg
              </div>
            </div>

            <div className="flex gap-2.5 mt-5 flex-wrap">
              <button
                onClick={() => setDialog({ mode: "submit", period })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary text-sm font-bold shadow-lg hover:bg-white/90 transition-colors"
              >
                <Lock className="size-3.5" /> Lås periode
              </button>
              <button
                onClick={() => openPdf(period, { preview: true })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/14 border border-white/30 text-white text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <Download className="size-3.5" /> Last ned PDF
              </button>
            </div>
          </div>
        );
      })}

      {lockedYears.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Innleverte rapporter
          </div>
          {lockedYears.map((year) => {
            const yearReports = lockedByYear.get(year) ?? [];
            return (
              <YearAccordion
                key={year}
                year={year}
                count={yearReports.length}
                defaultOpen={year === currentYear}
              >
                {yearReports.map((report) => {
                  const regs = regsInQuarter(registrations, report.period);
                  return (
                    <PeriodCard
                      key={report.period}
                      period={report.period}
                      report={report}
                      regsCount={regs.length}
                      totalKg={totalKg(regs)}
                      onLock={() => {}}
                      onUnlock={() =>
                        setDialog({ mode: "unlock", period: report.period })
                      }
                      onDownloadPdf={() => openPdf(report.period)}
                    />
                  );
                })}
              </YearAccordion>
            );
          })}
        </div>
      )}

      {dialog && (
        <ConfirmDialog
          config={dialog}
          regsCount={dialogRegsCount}
          totalKg={dialogTotal}
          onConfirm={handleConfirm}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
