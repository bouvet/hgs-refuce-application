"use client";

import { useState } from "react";
import { Send, Download, Lock, Check, Calendar, Unlock } from "lucide-react";
import { useWasteRegistrations } from "@/hooks/use-waste-registrations";
import { useReports } from "@/hooks/use-reports";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  daysLeftInQuarter,
  getCurrentQuarter,
  getPastQuarters,
  quarterLabel,
  quarterLabelLong,
} from "@/lib/quarters";
import { regsInQuarter, totalKg } from "@/lib/waste-utils";
import type { Report } from "@/lib/types";
import { ConfirmDialog, type DialogConfig } from "./confirm-dialog";

export function RapporteringContent() {
  const { registrations } = useWasteRegistrations();
  const { reports, submitReport, unlockReport } = useReports();
  const { user } = useCurrentUser();
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const periods = getPastQuarters(6);
  const currentPeriod = getCurrentQuarter();
  const currentReport = reports.find((r) => r.period === currentPeriod);
  const daysLeft = daysLeftInQuarter(currentPeriod);

  async function handleConfirm() {
    if (!dialog) return;
    if (dialog.mode === "submit") {
      await submitReport(dialog.period, user?.id ?? "admin");
    } else {
      await unlockReport(dialog.period);
    }
  }

  const currentRegsCount = regsInQuarter(registrations, currentPeriod).length;
  const currentTotal = totalKg(regsInQuarter(registrations, currentPeriod));

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

      {!currentReport && (
        <div
          className="relative rounded-2xl p-6 overflow-hidden text-white"
          style={{
            background: "linear-gradient(135deg, #3e7a3a 0%, #2d5a2a 100%)",
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
            Åpen periode
          </div>
          <div className="mt-2">
            <div className="text-3xl font-bold capitalize tracking-tight">
              {quarterLabelLong(currentPeriod)}
            </div>
            <div className="text-[13.5px] opacity-85 mt-1">
              {daysLeft} dager igjen · {currentRegsCount} registreringer ·{" "}
              {currentTotal.toFixed(1)} kg
            </div>
          </div>

          <div className="flex gap-2.5 mt-5 flex-wrap">
            <button
              onClick={() =>
                setDialog({ mode: "submit", period: currentPeriod })
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary text-sm font-bold shadow-lg hover:bg-white/90 transition-colors"
            >
              <Send className="size-3.5" /> Send rapport
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/14 border border-white/30 text-white text-sm font-medium hover:bg-white/20 transition-colors">
              <Download className="size-3.5" /> Last ned PDF
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Perioder
        </div>
        {periods
          .filter((p) => {
            const isCurrentOpen = p === currentPeriod && !currentReport;
            const regs = regsInQuarter(registrations, p);
            const report = reports.find((r) => r.period === p);
            return !isCurrentOpen && (regs.length > 0 || report);
          })
          .concat(currentReport ? [currentPeriod] : [])
          .sort((a, b) => b.localeCompare(a))
          .map((p) => {
            const regs = regsInQuarter(registrations, p);
            const total = totalKg(regs);
            const report = reports.find((r) => r.period === p) as
              | Report
              | undefined;
            return (
              <div
                key={p}
                className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-4"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    report ? "bg-secondary" : "bg-muted border border-border"
                  }`}
                >
                  {report ? (
                    <Check className="size-5 text-primary" />
                  ) : (
                    <Calendar className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px] font-semibold capitalize">
                      {quarterLabel(p)}
                    </span>
                    {report && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-secondary text-primary uppercase tracking-wide">
                        <Lock className="size-2.5" /> Innlevert
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {regs.length} registreringer · {total.toFixed(1)} kg
                    {report && (
                      <>
                        {" "}
                        · sendt{" "}
                        {new Date(report.submittedAt).toLocaleDateString(
                          "nb-NO",
                          {
                            day: "numeric",
                            month: "short",
                          },
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors">
                    <Download className="size-3.5" /> PDF
                  </button>
                  {report ? (
                    <button
                      onClick={() => setDialog({ mode: "unlock", period: p })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Unlock className="size-3.5" /> Lås opp
                    </button>
                  ) : (
                    <button
                      onClick={() => setDialog({ mode: "submit", period: p })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <Send className="size-3.5" /> Send
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

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
