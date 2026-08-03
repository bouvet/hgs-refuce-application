"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Copy,
  Check,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories";
import { createWasteRepository } from "@/lib/data/waste-repository";
import { dateToQuarter, quarterLabel } from "@/lib/quarters";
import { useReports } from "@/hooks/use-reports";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { WasteRegistration } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "mai",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "des",
];
const DAYS_SHORT = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getWeekDates(anchorDate: string): string[] {
  const d = new Date(anchorDate);
  const dow = (d.getDay() + 6) % 7; // 0=Mon..6=Sun
  const mon = new Date(d);
  mon.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

type WeightGrid = Record<string, Record<string, string>>;

export function RegistrerContent() {
  const { user, locationId } = useCurrentUser();
  const { isPeriodLocked } = useReports();
  const searchParams = useSearchParams();
  const datoParam = searchParams.get("dato");
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(datoParam ?? today);
  const [weights, setWeights] = useState<WeightGrid>({});
  const [savedSnapshot, setSavedSnapshot] = useState<WeightGrid>({});
  const [regsByDate, setRegsByDate] = useState<
    Record<string, WasteRegistration>
  >({});
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const weekQuarter = dateToQuarter(weekDates[0]);
  const weekLocked = isPeriodLocked(weekQuarter);

  // Load stored registrations whenever week changes. We grab one extra day
  // before the week so the "copy previous day" button can read its source
  // without an extra request.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id || !locationId) return;
      const repo = createWasteRepository(locationId);
      const prevOfFirst = new Date(weekDates[0]);
      prevOfFirst.setDate(prevOfFirst.getDate() - 1);
      const from = prevOfFirst.toISOString().slice(0, 10);
      const to = weekDates[6];
      const regs = await repo.getRegistrationsByDateRange(from, to);
      if (cancelled) return;
      const byDate: Record<string, WasteRegistration> = {};
      for (const r of regs) byDate[r.date] = r;
      setRegsByDate(byDate);

      const next: WeightGrid = {};
      for (const d of weekDates) {
        const reg = byDate[d];
        next[d] = {};
        for (const c of DEFAULT_WASTE_CATEGORIES) {
          const e = reg?.entries.find((en) => en.categoryId === c.id);
          next[d][c.id] = e && e.weightKg > 0 ? String(e.weightKg) : "";
        }
      }
      setWeights(next);
      setSavedSnapshot(JSON.parse(JSON.stringify(next)));
      setHasLoadedOnce(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDates[0], user?.id, locationId]);

  const getVal = (d: string, c: string) => weights[d]?.[c] ?? "";

  const setVal = (d: string, c: string, v: string) => {
    if (weekLocked) return;
    setWeights((w) => ({ ...w, [d]: { ...(w[d] || {}), [c]: v } }));
  };

  const step = (d: string, c: string, delta: number) => {
    if (weekLocked) return;
    const cur = parseFloat(getVal(d, c) || "0") || 0;
    const nxt = Math.max(0, Math.round((cur + delta) * 10) / 10);
    setVal(d, c, nxt > 0 ? String(nxt) : "");
  };

  const dayTotal = (d: string) =>
    DEFAULT_WASTE_CATEGORIES.reduce(
      (s, c) => s + (parseFloat(getVal(d, c.id) || "0") || 0),
      0,
    );

  const catTotal = (catId: string) =>
    weekDates.reduce(
      (s, d) => s + (parseFloat(getVal(d, catId) || "0") || 0),
      0,
    );

  const weekTotal = weekDates.reduce((s, d) => s + dayTotal(d), 0);

  const isFuture = (d: string) => d > today;

  const dirty = useMemo(() => {
    return weekDates.some((d) =>
      DEFAULT_WASTE_CATEGORIES.some((c) => {
        const saved = savedSnapshot[d]?.[c.id] ?? "";
        const cur = weights[d]?.[c.id] ?? "";
        return saved !== cur;
      }),
    );
  }, [weights, savedSnapshot, weekDates]);

  function copyPrevDay(d: string) {
    if (weekLocked || isFuture(d)) return;
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    const ps = prev.toISOString().slice(0, 10);
    const reg = regsByDate[ps];
    if (!reg) return;
    const next: Record<string, string> = {};
    for (const c of DEFAULT_WASTE_CATEGORIES) {
      const e = reg.entries.find((en) => en.categoryId === c.id);
      next[c.id] = e && e.weightKg > 0 ? String(e.weightKg) : "";
    }
    setWeights((w) => ({ ...w, [d]: next }));
  }

  function shiftWeek(delta: number) {
    const d = new Date(weekDates[0]);
    d.setDate(d.getDate() + delta * 7);
    setSelectedDate(d.toISOString().slice(0, 10));
  }

  async function saveAll() {
    if (weekLocked || !dirty || !user?.id || !locationId) return;
    const now = new Date().toISOString();
    const nextRegsByDate: Record<string, WasteRegistration> = { ...regsByDate };
    try {
      const repo = createWasteRepository(locationId);
      for (const d of weekDates) {
        if (isFuture(d)) continue;

        // Skip days where nothing changed since the last save/load.
        const dayChanged = DEFAULT_WASTE_CATEGORIES.some((c) => {
          const saved = savedSnapshot[d]?.[c.id] ?? "";
          const cur = weights[d]?.[c.id] ?? "";
          return saved !== cur;
        });
        if (!dayChanged) continue;

        const existing = regsByDate[d];

        // Don't create empty registrations: if the row is new and every
        // entry is 0/blank, skip it entirely.
        if (!existing && dayTotal(d) === 0) continue;

        const reg: WasteRegistration = {
          id: existing?.id ?? generateId(),
          date: d,
          entries: DEFAULT_WASTE_CATEGORIES.map((c) => ({
            categoryId: c.id,
            weightKg: parseFloat(weights[d]?.[c.id] || "0") || 0,
          })),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          createdBy: existing?.createdBy ?? user.id,
        };

        if (existing) {
          await repo.updateRegistration(reg);
        } else {
          await repo.createRegistration(reg);
        }
        nextRegsByDate[d] = reg;
      }
      setRegsByDate(nextRegsByDate);
      setSavedSnapshot(JSON.parse(JSON.stringify(weights)));
      toast.success("Uken er lagret");
    } catch (err) {
      setRegsByDate(nextRegsByDate);
      const msg = err instanceof Error ? err.message : "ukjent feil";
      toast.error(`Klarte ikke å lagre: ${msg}`);
    }
  }

  const weekLabel = (() => {
    const a = new Date(weekDates[0]);
    const b = new Date(weekDates[6]);
    const sameMonth = a.getMonth() === b.getMonth();
    if (sameMonth)
      return `${a.getDate()}.–${b.getDate()}. ${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
    return `${a.getDate()}. ${MONTHS[a.getMonth()]} – ${b.getDate()}. ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  })();

  const canGoNext = new Date(weekDates[6]) < new Date(today);

  if (!hasLoadedOnce) {
    return (
      <div className="flex flex-col gap-4 max-w-5xl">
        <div className="flex items-end gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-80 rounded-[9px]" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-12 w-40 rounded-xl self-end" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 max-w-5xl">
      {/* Title row */}
      <div className="flex items-end gap-4 mb-5">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Registrer avfall
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fyll inn vekt per kategori for hver dag. Endringer lagres når du
            trykker Lagre.
          </p>
        </div>
        {/* Week stepper */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <button
            onClick={() => shiftWeek(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-[9px] border border-border bg-card hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex items-center gap-1.5 h-9 px-3 rounded-[9px] border border-border bg-card font-semibold text-[13px] min-w-52 justify-center">
            <Calendar className="size-3.5 text-primary shrink-0" />
            <span className="capitalize">{weekLabel}</span>
          </div>
          <button
            onClick={() => canGoNext && shiftWeek(1)}
            disabled={!canGoNext}
            className="h-9 w-9 flex items-center justify-center rounded-[9px] border border-border bg-card hover:bg-muted transition-colors disabled:opacity-35"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setSelectedDate(today)}
            className="h-9 px-3 rounded-[9px] border border-secondary bg-secondary text-primary text-[13px] font-semibold hover:bg-secondary/80 transition-colors"
          >
            Denne uken
          </button>
        </div>
      </div>

      {/* Locked banner */}
      {weekLocked && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary border border-secondary mb-4">
          <Lock className="size-4.5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <strong>{quarterLabel(weekQuarter)}</strong> er innlevert og låst.
            Kontakt administrator for å åpne perioden.
          </div>
          <button
            onClick={() => shiftWeek(1)}
            className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
          >
            Gå til nyere uke →
          </button>
        </div>
      )}

      {/* Week grid */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th
                  className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs bg-muted/50 w-44 border-b border-border"
                  style={{ minWidth: 160 }}
                >
                  Kategori
                </th>
                {weekDates.map((d) => {
                  const isToday = d === today;
                  const future = isFuture(d);
                  const dt = dayTotal(d);
                  const dowIdx = new Date(d).getDay();
                  const dow =
                    DAYS_SHORT[dowIdx].charAt(0).toUpperCase() +
                    DAYS_SHORT[dowIdx].slice(1, 3);
                  return (
                    <th
                      key={d}
                      className="text-center px-2 py-2 border-l border-b border-border font-semibold text-xs cursor-pointer"
                      style={{
                        background: isToday
                          ? "var(--secondary)"
                          : "var(--muted)",
                        color: future
                          ? "var(--muted-foreground)"
                          : "var(--muted-foreground)",
                        opacity: future ? 0.5 : 1,
                        minWidth: 90,
                      }}
                      onClick={() => !future && setSelectedDate(d)}
                    >
                      <div className="text-[10.5px] font-bold tracking-wide">
                        {dow}
                      </div>
                      <div
                        className="text-[17px] font-bold mt-0.5"
                        style={{
                          color: future
                            ? "var(--muted-foreground)"
                            : isToday
                              ? "var(--primary)"
                              : "var(--foreground)",
                        }}
                      >
                        {d.slice(8, 10)}
                      </div>
                      <div
                        className="text-[10px] font-semibold mt-0.5"
                        style={{
                          color: future
                            ? "transparent"
                            : dt > 0
                              ? "var(--primary)"
                              : "var(--muted-foreground)",
                        }}
                      >
                        {future ? "—" : dt > 0 ? `${dt.toFixed(1)} kg` : "tom"}
                      </div>
                    </th>
                  );
                })}
                <th className="text-right pr-4 pl-2 py-2.5 border-l border-b border-border font-semibold text-xs bg-muted/50 w-24 min-w-[96px]">
                  Sum
                </th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_WASTE_CATEGORIES.map((cat) => (
                <tr key={cat.id}>
                  <td className="px-4 py-2.5 border-t border-border">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-[7px] shrink-0 flex items-center justify-center"
                        style={{ background: cat.accent ?? "var(--muted)" }}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-[3px]"
                          style={{
                            background: cat.color ?? "var(--primary)",
                          }}
                        />
                      </div>
                      <span className="font-semibold text-foreground text-[13px]">
                        {cat.label}
                      </span>
                    </div>
                  </td>
                  {weekDates.map((d) => {
                    const future = isFuture(d);
                    const val = getVal(d, cat.id);
                    const hasVal = val !== "" && parseFloat(val) > 0;
                    const isToday = d === today;
                    return (
                      <td
                        key={d}
                        className="border-t border-l border-border px-1 py-2"
                        style={{
                          background: isToday
                            ? "rgba(62,122,58,0.035)"
                            : "transparent",
                        }}
                      >
                        {future ? (
                          <div className="text-center text-muted-foreground/30 text-sm">
                            —
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => step(d, cat.id, -0.5)}
                              disabled={weekLocked || !hasVal}
                              className="w-5 h-7 rounded-[6px] border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors text-xs leading-none select-none"
                            >
                              −
                            </button>
                            <input
                              value={val}
                              onChange={(e) =>
                                setVal(d, cat.id, e.target.value)
                              }
                              placeholder="0"
                              disabled={weekLocked}
                              inputMode="decimal"
                              className="h-7 rounded-[7px] text-center text-[13px] font-semibold outline-none transition-colors"
                              style={{
                                width: 40,
                                border: `1px solid ${hasVal ? "var(--primary)" : "var(--border)"}`,
                                background: hasVal
                                  ? "var(--secondary)"
                                  : "var(--card)",
                              }}
                            />
                            <button
                              onClick={() => step(d, cat.id, 0.5)}
                              disabled={weekLocked}
                              className="w-5 h-7 rounded-[6px] border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors text-xs leading-none select-none"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td
                    className="border-t border-l border-border px-3 text-right font-semibold text-[13px]"
                    style={{
                      color:
                        catTotal(cat.id) > 0
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    {catTotal(cat.id) > 0
                      ? `${catTotal(cat.id).toFixed(1)} kg`
                      : "—"}
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-muted/50">
                <td className="px-4 py-2.5 border-t-2 border-border font-bold text-[11px] uppercase tracking-wide text-muted-foreground">
                  Sum dag
                </td>
                {weekDates.map((d) => {
                  const future = isFuture(d);
                  const t = dayTotal(d);
                  return (
                    <td
                      key={d}
                      className="border-t-2 border-l border-border text-center py-2.5 font-bold text-[13px]"
                      style={{
                        color: future
                          ? "var(--muted-foreground)"
                          : t > 0
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                        opacity: future ? 0.4 : 1,
                      }}
                    >
                      {future ? "—" : t > 0 ? t.toFixed(1) : "0"}
                    </td>
                  );
                })}
                <td className="border-t-2 border-l border-border text-right pr-4 py-2.5 font-bold text-[14px]">
                  {weekTotal.toFixed(1)} kg
                </td>
              </tr>

              {/* Copy prev row */}
              {!weekLocked && (
                <tr>
                  <td className="px-4 py-2 border-t border-border text-[11.5px] text-muted-foreground">
                    Kopier fra dagen før
                  </td>
                  {weekDates.map((d) => {
                    const future = isFuture(d);
                    const prev = new Date(d);
                    prev.setDate(prev.getDate() - 1);
                    const hasPrev =
                      !!regsByDate[prev.toISOString().slice(0, 10)];
                    return (
                      <td
                        key={d}
                        className="border-t border-l border-border text-center px-1 py-1.5"
                      >
                        <button
                          onClick={() => copyPrevDay(d)}
                          disabled={future || !hasPrev}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-border bg-card text-[10.5px] font-semibold transition-colors disabled:opacity-30 hover:bg-muted"
                          style={{
                            color:
                              future || !hasPrev
                                ? "var(--muted-foreground)"
                                : "var(--primary)",
                          }}
                        >
                          <Copy className="size-2.5" />
                          kopi
                        </button>
                      </td>
                    );
                  })}
                  <td className="border-t border-l border-border" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save bar */}
      <div
        className="flex items-center gap-4 px-4 py-3.5 bg-card border border-border rounded-xl sticky bottom-4"
        style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}
      >
        <div className="flex-1">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Uke-sum
          </div>
          <div className="text-[22px] font-bold leading-tight tabular-nums">
            {weekTotal.toFixed(1)} kg
          </div>
        </div>
        {dirty && !weekLocked && (
          <div
            className="text-[12.5px] font-semibold flex items-center gap-1.5"
            style={{ color: "#b67a2a" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            Ulagrede endringer
          </div>
        )}
        <button
          onClick={saveAll}
          disabled={weekLocked || !dirty}
          className="flex items-center gap-2 h-11 px-5 rounded-[10px] font-semibold text-[14px] transition-all disabled:cursor-default"
          style={{
            background:
              weekLocked || !dirty ? "var(--muted)" : "var(--primary)",
            color: weekLocked || !dirty ? "var(--muted-foreground)" : "white",
            boxShadow:
              weekLocked || !dirty ? "none" : "0 3px 10px rgba(62,122,58,0.25)",
          }}
        >
          <Check className="size-4" />
          Lagre uken
        </button>
      </div>

      {/* Tips */}
      <div className="mt-3 text-[12px] text-muted-foreground flex gap-4 flex-wrap">
        <span>Bruk + / − for justering med 0,5 kg</span>
        <span>Kopier fra dagen før for rask registrering</span>
      </div>
    </div>
  );
}
