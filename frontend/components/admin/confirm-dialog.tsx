"use client";

import { useState } from "react";
import { Send, Unlock, Check } from "lucide-react";
import { quarterLabel } from "@/lib/quarters";

export type DialogConfig = { mode: "submit" | "unlock"; period: string };

export function ConfirmDialog({
  config,
  regsCount,
  totalKg,
  onConfirm,
  onClose,
}: {
  config: DialogConfig;
  regsCount: number;
  totalKg: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const { mode, period } = config;

  function confirm() {
    setSending(true);
    setTimeout(() => {
      onConfirm();
      setDone(true);
      setTimeout(onClose, 1000);
    }, 700);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-110 max-w-[95vw] bg-card border border-border rounded-2xl p-6 shadow-2xl">
        {done ? (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
              <Check className="size-8 text-primary" strokeWidth={2.5} />
            </div>
            <div className="text-lg font-bold text-foreground">
              {mode === "submit" ? "Rapport sendt" : "Periode låst opp"}
            </div>
            <div className="text-sm text-muted-foreground mt-1 capitalize">
              {quarterLabel(period)}
            </div>
          </div>
        ) : (
          <>
            <div className="text-[18px] font-bold text-foreground mb-1.5">
              {mode === "submit" ? "Send rapport?" : "Lås opp periode?"}
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {mode === "submit" ? (
                <>
                  Du er i ferd med å sende{" "}
                  <strong className="text-foreground capitalize">
                    {quarterLabel(period)}
                  </strong>{" "}
                  til Miljøfyrtårn. Perioden vil låses for videre endringer.
                </>
              ) : (
                <>
                  Å låse opp{" "}
                  <strong className="text-foreground capitalize">
                    {quarterLabel(period)}
                  </strong>{" "}
                  lar registrerere endre data. Du må sende rapporten på nytt
                  etterpå.
                </>
              )}
            </p>
            {mode === "submit" && (
              <div className="bg-muted rounded-xl p-3.5 mb-4 border border-border text-sm">
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Periode</span>
                  <span className="font-semibold capitalize">
                    {quarterLabel(period)}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Registreringer</span>
                  <span className="font-semibold">{regsCount}</span>
                </div>
                <div className="flex justify-between py-0.5 mt-1 pt-2 border-t border-border">
                  <span className="text-muted-foreground">Totalt</span>
                  <span className="font-bold">{totalKg.toFixed(1)} kg</span>
                </div>
              </div>
            )}
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={onClose}
                disabled={sending}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={confirm}
                disabled={sending}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity ${
                  mode === "submit" ? "bg-primary" : "bg-amber-600"
                } ${sending ? "opacity-60" : ""}`}
              >
                {sending ? (
                  "Sender..."
                ) : mode === "submit" ? (
                  <>
                    <Send className="size-3.5" /> Send rapport
                  </>
                ) : (
                  <>
                    <Unlock className="size-3.5" /> Lås opp
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
