"use client";

import { Send, Download, Lock, Check, Calendar, Unlock } from "lucide-react";
import { quarterLabel } from "@/lib/quarters";
import type { Report } from "@/lib/types";

type Props = {
  period: string;
  report: Report | undefined;
  regsCount: number;
  totalKg: number;
  onLock: () => void;
  onUnlock: () => void;
  onDownloadPdf: () => void;
};

export function PeriodCard({
  period,
  report,
  regsCount,
  totalKg,
  onLock,
  onUnlock,
  onDownloadPdf,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5 flex items-center gap-4">
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
            {quarterLabel(period)}
          </span>
          {report && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-secondary text-primary uppercase tracking-wide">
              <Lock className="size-2.5" /> Låst
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {regsCount} registreringer · {totalKg.toFixed(1)} kg
          {report && (
            <>
              {" "}
              · låst{" "}
              {new Date(report.submittedAt).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "short",
              })}
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onDownloadPdf}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <Download className="size-3.5" /> PDF
        </button>
        {report ? (
          <button
            onClick={onUnlock}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Unlock className="size-3.5" /> Lås opp
          </button>
        ) : (
          <button
            onClick={onLock}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Send className="size-3.5" /> Lås
          </button>
        )}
      </div>
    </div>
  );
}
