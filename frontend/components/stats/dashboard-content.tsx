"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Check,
  AlertTriangle,
  Sparkles,
  Lock,
} from "lucide-react";
import { useWasteRegistrations } from "@/hooks/use-waste-registrations";
import { useReports } from "@/hooks/use-reports";
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories";
import {
  getCurrentQuarter,
  getPastQuarters,
  quarterLabelLong,
  quarterToMonths,
  daysLeftInQuarter,
  daysInQuarter,
  quarterStartDate,
  quarterEndDate,
} from "@/lib/quarters";
import type { WasteRegistration } from "@/lib/types";

function ProgressRing({ pct, size = 60 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(Math.max(pct, 0), 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.22}
        fontWeight="700"
        fill="currentColor"
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function totalKg(regs: WasteRegistration[]): number {
  return regs.reduce(
    (s, r) => s + r.entries.reduce((x, e) => x + e.weightKg, 0),
    0,
  );
}

function regsInQuarter(
  regs: WasteRegistration[],
  quarter: string,
): WasteRegistration[] {
  const start = quarterStartDate(quarter);
  const end = quarterEndDate(quarter);
  return regs.filter((r) => r.date >= start && r.date <= end);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function SparklineSvg({ data }: { data: number[] }) {
  const h = 56;
  const w = 400;
  const max = Math.max(...data, 1);
  const step = w / (data.length - 1);
  const pts = data
    .map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`)
    .join(" ");
  const areaPts = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#spark-fill)" />
      <polyline
        points={pts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DOW_LABELS = ["M", "T", "O", "T", "F", "L", "S"];
const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAI",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OKT",
  "NOV",
  "DES",
];

function QuarterCalendar({
  quarter,
  registrations,
  today,
}: {
  quarter: string;
  registrations: WasteRegistration[];
  today: string;
}) {
  const months = quarterToMonths(quarter);

  // Build daily kg map
  const dailyKg = new Map<string, number>();
  for (const reg of registrations) {
    const kg = reg.entries.reduce((s, e) => s + e.weightKg, 0);
    dailyKg.set(reg.date, (dailyKg.get(reg.date) ?? 0) + kg);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {months.map((month) => {
        const [y, m] = month.split("-").map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        // Monday-based offset: Sun=0 → convert to Mon=0..Sun=6
        const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
        const cells: (number | null)[] = [
          ...Array(firstDow).fill(null),
          ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
        ];

        return (
          <div key={month}>
            <div className="text-[10.5px] font-bold text-foreground uppercase tracking-[0.5px] text-center mb-1.5">
              {MONTH_LABELS[m - 1]}
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-0.5">
              {DOW_LABELS.map((d, i) => (
                <div
                  key={i}
                  className="text-[9px] font-semibold text-muted-foreground text-center py-0.5"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} />;
                const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const kg = dailyKg.get(dateStr) ?? 0;
                const isToday = dateStr === today;
                const isFuture = dateStr > today;
                const hasData = kg > 0;

                const intensity = hasData ? Math.min(kg / 25, 1) : 0;
                const bgOpacity = hasData ? 0.15 + intensity * 0.55 : undefined;
                const cellBg = hasData
                  ? `rgba(62,122,58,${bgOpacity!.toFixed(2)})`
                  : undefined;
                const cellColor = hasData
                  ? intensity > 0.5
                    ? "#ffffff"
                    : "#33251a"
                  : undefined;

                return (
                  <div
                    key={dateStr}
                    title={
                      hasData ? `${dateStr}: ${kg.toFixed(1)} kg` : dateStr
                    }
                    style={{
                      height: 22,
                      borderRadius: 5,
                      fontSize: "9.5px",
                      fontWeight: 600,
                      background: cellBg,
                      color: cellColor,
                      opacity: isFuture ? 0.4 : 1,
                      outline: isToday
                        ? "1.5px solid var(--primary)"
                        : undefined,
                      outlineOffset: isToday ? "-1px" : undefined,
                      fontVariantNumeric: "tabular-nums",
                    }}
                    className={`flex items-center justify-center border ${
                      hasData ? "border-transparent" : "border-border"
                    } ${!hasData && !isFuture ? "bg-background" : ""} ${
                      isFuture && !hasData ? "bg-transparent" : ""
                    }`}
                  >
                    {day}
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

export function DashboardContent() {
  const { registrations } = useWasteRegistrations();
  const { reports } = useReports();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));

  const quarter = getCurrentQuarter();
  const pastQuarters = getPastQuarters(6);
  const prevQuarter = pastQuarters[1] ?? null;

  const regsThis = regsInQuarter(registrations, quarter);
  const regsPrev = prevQuarter ? regsInQuarter(registrations, prevQuarter) : [];
  const totalThis = totalKg(regsThis);
  const totalPrev = totalKg(regsPrev);

  // Prorate: what % of current quarter has elapsed?
  const qStart = quarterStartDate(quarter);
  const qEnd = quarterEndDate(quarter);
  const daysTotal = daysInQuarter(quarter);
  const daysElapsed = daysBetween(qStart, today);
  const pctThrough = Math.min(daysElapsed / daysTotal, 1);
  const daysLeft = daysLeftInQuarter(quarter);

  const prevAtSamePoint = totalPrev * pctThrough;
  const delta =
    prevAtSamePoint > 0
      ? ((totalThis - prevAtSamePoint) / prevAtSamePoint) * 100
      : null;

  // Last registration staleness
  const sortedRegs = [...registrations].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const lastReg = sortedRegs[0];
  const lastAgo = lastReg ? daysBetween(lastReg.date, today) : null;

  // 30-day trend sparkline
  const trendData: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const r = registrations.find((reg) => reg.date === ds);
    trendData.push(r ? r.entries.reduce((s, e) => s + e.weightKg, 0) : 0);
  }

  // Category breakdown for this quarter
  const catTotals = DEFAULT_WASTE_CATEGORIES.map((c) => {
    const thisVal = regsThis.reduce(
      (s, r) =>
        s + (r.entries.find((e) => e.categoryId === c.id)?.weightKg ?? 0),
      0,
    );
    const prevVal = regsPrev.reduce(
      (s, r) =>
        s + (r.entries.find((e) => e.categoryId === c.id)?.weightKg ?? 0),
      0,
    );
    const prevProrated = prevVal * pctThrough;
    const catDelta =
      prevProrated > 0 ? ((thisVal - prevProrated) / prevProrated) * 100 : null;
    return { cat: c, val: thisVal, delta: catDelta };
  }).filter((x) => x.val > 0);

  const totalForPct = catTotals.reduce((s, c) => s + c.val, 0) || 1;

  const anomaly = [...catTotals]
    .filter((c) => c.delta !== null && c.delta > 25)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];

  const submittedReport = reports.find((r) => r.period === quarter);

  if (registrations.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Ingen registreringer ennå.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Title row */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Oversikt</h1>
        <span className="text-sm text-muted-foreground">
          {quarterLabelLong(quarter)}
        </span>
      </div>

      {/* Top row: total + period status + freshness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Total hero card */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Totalt dette kvartalet
          </div>
          <div className="flex items-end gap-2 mt-2.5">
            <span className="text-5xl font-bold tracking-tight tabular-nums leading-none">
              {totalThis.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground mb-1">kg</span>
            {delta !== null && (
              <span
                className={`flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                  delta < 0
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {delta < 0 ? (
                  <TrendingDown className="size-3" />
                ) : (
                  <TrendingUp className="size-3" />
                )}
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {regsThis.length} registreringer
            {prevQuarter
              ? ` · forrige kvartal: ${totalPrev.toFixed(1)} kg`
              : ""}
          </div>
          <div className="mt-3">
            <SparklineSvg data={trendData} />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>30 dager siden</span>
              <span>siste 30 dager</span>
              <span>i dag</span>
            </div>
          </div>
        </div>

        {/* Quarter status */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Innleveringsfrist
          </div>
          {submittedReport ? (
            <div className="flex items-center gap-3 mt-3">
              <div className="w-8 h-8 rounded-[9px] bg-secondary flex items-center justify-center shrink-0">
                <Check className="size-4.5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">
                  Innlevert
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(submittedReport.submittedAt).toLocaleDateString(
                    "nb-NO",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1.5 mt-2.5">
                <span className="text-4xl font-bold tabular-nums leading-none">
                  {daysLeft}
                </span>
                <span className="text-sm text-muted-foreground">
                  dager igjen
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1.5">
                Frist:{" "}
                {new Date(qEnd).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "long",
                })}
              </div>
              <div className="mt-3">
                <ProgressRing pct={pctThrough} size={60} />
              </div>
            </>
          )}
        </div>

        {/* Freshness */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Siste registrering
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span
              className={`text-3xl font-bold leading-none ${
                lastAgo !== null && lastAgo > 3
                  ? "text-amber-600"
                  : "text-foreground"
              }`}
            >
              {lastAgo === 0
                ? "I dag"
                : lastAgo === 1
                  ? "I går"
                  : lastAgo !== null
                    ? `${lastAgo}d siden`
                    : "–"}
            </span>
          </div>
          {lastReg && (
            <div className="text-xs text-muted-foreground mt-1.5">
              {new Date(lastReg.date).toLocaleDateString("nb-NO", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
          )}
          {lastAgo !== null && lastAgo > 3 && (
            <div className="flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-amber-600">
              <AlertTriangle className="size-3.5" /> Data kan være foreldet
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown + insights */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
        {/* Breakdown */}
        <div className="md:col-span-3 bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex justify-between mb-3">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Fordeling
            </div>
            <div className="text-xs text-muted-foreground">
              {totalForPct.toFixed(1)} kg
            </div>
          </div>
          <div className="flex h-8 rounded-lg overflow-hidden border border-border">
            {catTotals.map(({ cat, val }) => {
              const pct = (val / totalForPct) * 100;
              if (pct < 0.5) return null;
              return (
                <div
                  key={cat.id}
                  style={{
                    width: `${pct}%`,
                    background: cat.color ?? "var(--primary)",
                  }}
                  className="flex items-center justify-center"
                  title={`${cat.label}: ${pct.toFixed(0)}%`}
                >
                  {pct > 8 && (
                    <span className="text-white text-[10px] font-semibold">
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 divide-y divide-border">
            {catTotals.map(({ cat, val, delta: catDelta }) => (
              <div key={cat.id} className="flex items-center gap-2.5 py-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                  style={{ background: cat.color ?? "var(--primary)" }}
                />
                <span className="text-[12.5px] text-foreground flex-1 truncate">
                  {cat.label}
                </span>
                <span className="text-[12.5px] font-semibold text-foreground tabular-nums whitespace-nowrap">
                  {val.toFixed(1)} kg
                </span>
                {catDelta !== null && (
                  <span
                    className={`text-[11px] font-semibold w-12 text-right whitespace-nowrap ${
                      Math.abs(catDelta) < 5
                        ? "text-muted-foreground"
                        : catDelta > 0
                          ? "text-red-600"
                          : "text-primary"
                    }`}
                  >
                    {catDelta >= 0 ? "+" : ""}
                    {catDelta.toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="md:col-span-2 bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Innsikt
          </div>
          {anomaly ? (
            <div className="flex gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <TrendingUp className="size-4 text-amber-600" />
              </div>
              <div className="text-[12.5px] leading-snug">
                <div className="font-semibold text-foreground">
                  {anomaly.cat.label} er høyere enn vanlig
                </div>
                <div className="text-muted-foreground mt-0.5">
                  {anomaly.delta?.toFixed(0)}% over forrige kvartal.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 p-3 rounded-xl bg-secondary/60">
              <Check className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-[12.5px]">
                Ingen uvanlige mønstre dette kvartalet.
              </span>
            </div>
          )}
          <div className="flex gap-2.5 p-3 rounded-xl bg-muted border border-border mt-2.5">
            <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
            <div className="text-[12.5px]">
              <div className="font-semibold">Matavfall sortert stabilt</div>
              <div className="text-muted-foreground mt-0.5">
                Ingen sprang på over 10% hittil i år.
              </div>
            </div>
          </div>
          {submittedReport === undefined && (
            <div className="flex gap-2.5 p-3 rounded-xl bg-muted border border-border mt-2.5">
              <Lock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-[12.5px] text-muted-foreground">
                Husk å sende kvartalsrapport.{" "}
                <a
                  href="/rapportering"
                  className="text-primary font-medium hover:underline"
                >
                  Gå til rapportering →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar strip — registration heatmap for the quarter */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex justify-between mb-3">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
            Registreringer — {quarterLabelLong(quarter)}
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-[3px] inline-block"
                style={{ background: "rgba(62,122,58,0.7)" }}
              />
              Registrert
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[3px] inline-block bg-muted border border-border" />
              Ingen data
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-[3px] inline-block bg-muted/40 border border-border" />
              Fremtidig
            </span>
          </div>
        </div>
        <QuarterCalendar
          quarter={quarter}
          registrations={registrations}
          today={today}
        />
      </div>
    </div>
  );
}
