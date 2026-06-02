"use client";
import { useEffect, useState, useContext } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Copy,
  Plus,
  Minus,
  Lock,
} from "lucide-react";
import { DatePicker } from "./date-picker";
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories";
import { createWasteRepository } from "@/lib/data/waste-repository";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useReports } from "@/hooks/use-reports";
import { dateToQuarter, quarterLabel } from "@/lib/quarters";
import type { WasteRegistration } from "@/lib/types";
import { UserContext } from "@/lib/user-context";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type WeightMap = Record<string, string>;

function emptyWeights(): WeightMap {
  return Object.fromEntries(DEFAULT_WASTE_CATEGORIES.map((c) => [c.id, ""]));
}

function weightsFromReg(reg: WasteRegistration): WeightMap {
  const w = emptyWeights();
  for (const entry of reg.entries) {
    w[entry.categoryId] = entry.weightKg > 0 ? String(entry.weightKg) : "";
  }
  return w;
}

function prevDateOf(ds: string): string {
  const d = new Date(ds);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function RegistrationForm() {
  const { user } = useCurrentUser();
  const { locationId } = useContext(UserContext);
  const { isPeriodLocked } = useReports();
  const searchParams = useSearchParams();
  const datoParam = searchParams.get("dato");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const initialDs = datoParam ?? todayStr;
  const [dateStr, setDateStr] = useState(initialDs);
  const [weights, setWeights] = useState<WeightMap>(emptyWeights());
  const [existingId, setExistingId] = useState<string | null>(null);
  const [prevReg, setPrevReg] = useState<WasteRegistration | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const quarter = dateToQuarter(dateStr);
  const locked = isPeriodLocked(quarter);

  // Load registration for current date + previous day in one range query
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id || !locationId) return;
      const repo = createWasteRepository(locationId, user.id);
      const prevDs = prevDateOf(dateStr);
      const regs = await repo.getRegistrationsByDateRange(
        prevDs,
        dateStr,
      );
      if (cancelled) return;
      const current = regs.find((r) => r.date === dateStr) ?? null;
      const prev = regs.find((r) => r.date === prevDs) ?? null;
      setExistingId(current?.id ?? null);
      setWeights(current ? weightsFromReg(current) : emptyWeights());
      setPrevReg(prev);
    })();
    return () => {
      cancelled = true;
    };
  }, [dateStr, user?.id, locationId]);

  function changeDate(ds: string) {
    setDateStr(ds);
  }

  function goDay(delta: number) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    if (next <= todayStr) changeDate(next);
  }

  function handleDateSelect(newDate: Date) {
    const ds = format(newDate, "yyyy-MM-dd");
    if (ds <= todayStr) changeDate(ds);
    setShowDatePicker(false);
  }

  function step(id: string, delta: number) {
    if (locked) return;
    const cur = parseFloat(weights[id] || "0") || 0;
    const next = Math.max(0, Math.round((cur + delta) * 10) / 10);
    setWeights((w) => ({ ...w, [id]: next > 0 ? String(next) : "" }));
  }

  function setVal(id: string, v: string) {
    if (locked) return;
    setWeights((w) => ({ ...w, [id]: v }));
  }

  function copyYesterday() {
    if (locked || !prevReg) return;
    setWeights(weightsFromReg(prevReg));
  }

  async function handleSave() {
    if (locked || !user?.id || !locationId) return;
    setSaving(true);
    const wasUpdate = existingId !== null;
    const now = new Date().toISOString();
    const reg: WasteRegistration = {
      id: existingId ?? generateId(),
      date: dateStr,
      entries: DEFAULT_WASTE_CATEGORIES.map((c) => ({
        categoryId: c.id,
        weightKg: parseFloat(weights[c.id] || "0") || 0,
      })),
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
    };
    try {
      const repo = createWasteRepository(locationId, user.id);
      await repo.saveRegistration(reg);
      setExistingId(reg.id);
      toast.success(wasUpdate ? "Registrering oppdatert" : "Registrering lagret");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Kunne ikke lagre registrering",
      );
    } finally {
      setSaving(false);
    }
  }

  const isToday = dateStr === todayStr;
  const isYesterday =
    dateStr ===
    (() => {
      const d = new Date(todayStr);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();

  const dayLabel = isToday
    ? "I dag"
    : isYesterday
      ? "I går"
      : format(parseISO(dateStr), "EEEE", { locale: nb });
  const dateLabel = format(parseISO(dateStr), "d. MMM", { locale: nb });

  const totalKg = DEFAULT_WASTE_CATEGORIES.reduce(
    (sum, c) => sum + (parseFloat(weights[c.id] || "0") || 0),
    0,
  );

  const prevTotalKg = prevReg
    ? prevReg.entries.reduce((s, e) => s + e.weightKg, 0)
    : 0;

  return (
    <div className="flex flex-col gap-0 max-w-lg mx-auto pb-4">
      {/* Title */}
      <div className="px-1 pt-1 pb-3">
        <h1 className="text-[30px] font-bold tracking-tight leading-none">
          Registrer avfall
        </h1>
      </div>

      {/* Date selector */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => goDay(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => setShowDatePicker(true)}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-sm font-medium"
        >
          <Calendar className="size-4 text-primary" />
          <span className="font-semibold capitalize">{dayLabel}</span>
          <span className="text-muted-foreground">· {dateLabel}</span>
        </button>
        <button
          onClick={() => goDay(1)}
          disabled={dateStr >= todayStr}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card hover:bg-muted transition-colors disabled:opacity-35"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {showDatePicker && (
        <div className="mb-3">
          <DatePicker date={parseISO(dateStr)} onSelect={handleDateSelect} />
        </div>
      )}

      {/* Locked banner */}
      {locked && (
        <div className="flex gap-2.5 items-start p-3.5 rounded-2xl bg-secondary border border-secondary mb-3">
          <Lock className="size-4.5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 text-sm leading-snug">
            <div className="font-semibold text-foreground">
              Innlevert — {quarterLabel(quarter)} er rapportert.
            </div>
            <div className="text-muted-foreground mt-0.5">
              Kontakt administrator for å åpne.
            </div>
          </div>
        </div>
      )}

      {/* Copy yesterday */}
      {!locked && prevReg && (
        <div className="mb-3">
          <button
            onClick={copyYesterday}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Copy className="size-3.5 text-primary" />
            <span>Samme som {isToday ? "i går" : "dagen før"}</span>
            {prevTotalKg > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {prevTotalKg.toFixed(1)} kg
              </span>
            )}
          </button>
        </div>
      )}

      {/* Category rows */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {DEFAULT_WASTE_CATEGORIES.map((cat, i) => {
          const prev = prevReg?.entries.find(
            (e) => e.categoryId === cat.id,
          )?.weightKg;
          const val = weights[cat.id];
          const hasVal = val !== "" && parseFloat(val) > 0;
          return (
            <div
              key={cat.id}
              className={`flex items-center gap-2.5 px-3 py-3 ${
                i < DEFAULT_WASTE_CATEGORIES.length - 1
                  ? "border-b border-border"
                  : ""
              } ${locked ? "opacity-75" : ""}`}
            >
              {/* Color dot */}
              <div
                className="w-7.5 h-7.5 rounded-[9px] shrink-0 flex items-center justify-center"
                style={{ background: cat.accent ?? "var(--muted)" }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-[3px]"
                  style={{ background: cat.color ?? "var(--primary)" }}
                />
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-foreground truncate">
                  {cat.label}
                </div>
                {prev && prev > 0 && !hasVal && !locked && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    forrige: {prev.toFixed(1)} kg
                  </div>
                )}
              </div>

              {/* Stepper + input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => step(cat.id, -0.5)}
                  disabled={locked || !hasVal}
                  className="w-7 h-7 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                >
                  <Minus className="size-3" />
                </button>
                <input
                  value={val}
                  onChange={(e) => setVal(cat.id, e.target.value)}
                  placeholder="0.0"
                  disabled={locked}
                  inputMode="decimal"
                  className="w-12 h-8 rounded-lg text-center text-[14px] font-semibold outline-none transition-colors"
                  style={{
                    border: `1px solid ${hasVal ? "var(--primary)" : "var(--border)"}`,
                    background: hasVal
                      ? "var(--secondary)"
                      : "var(--background)",
                  }}
                />
                <button
                  onClick={() => step(cat.id, 0.5)}
                  disabled={locked}
                  className="w-7 h-7 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="mt-4">
        <button
          onClick={handleSave}
          disabled={locked || totalKg === 0 || saving}
          className="w-full h-14 rounded-2xl text-base font-semibold flex items-center justify-center gap-2.5 transition-all"
          style={{
            background:
              locked || totalKg === 0 ? "var(--muted)" : "var(--primary)",
            color:
              locked || totalKg === 0 ? "var(--muted-foreground)" : "white",
            boxShadow:
              locked || totalKg === 0
                ? "none"
                : "0 4px 14px rgba(62,122,58,0.25)",
            cursor: locked || totalKg === 0 ? "default" : "pointer",
          }}
        >
          {existingId ? "Oppdater registrering" : "Lagre registrering"}
          {totalKg > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-white/20 text-[13px] font-bold">
              {totalKg.toFixed(1)} kg
            </span>
          )}
        </button>
        {existingId && !locked && (
          <div className="text-center text-xs text-muted-foreground mt-2">
            Allerede registrert for denne dagen
          </div>
        )}
      </div>
    </div>
  );
}
