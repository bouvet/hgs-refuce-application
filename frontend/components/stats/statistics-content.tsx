"use client";

import { useState, useMemo } from "react";
import { useWasteRegistrations } from "@/hooks/use-waste-registrations";
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories";
import {
  dateToQuarter,
  quarterStartDate,
  quarterEndDate,
} from "@/lib/quarters";
import type { WasteRegistration } from "@/lib/types";
import { cn } from "@/lib/utils";

type Period = "week" | "month" | "year";

const DAY_LABELS = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];

function regsInQuarter(
  regs: WasteRegistration[],
  quarter: string,
): WasteRegistration[] {
  const start = quarterStartDate(quarter);
  const end = quarterEndDate(quarter);
  return regs.filter((r) => r.date >= start && r.date <= end);
}

function catVal(regs: WasteRegistration[], catId: string): number {
  return regs.reduce(
    (s, r) =>
      s + (r.entries.find((e) => e.categoryId === catId)?.weightKg ?? 0),
    0,
  );
}

export function StatisticsContent() {
  const { registrations } = useWasteRegistrations();
  const [period, setPeriod] = useState<Period>("month");

  const trend = useMemo(() => {
    const today = new Date();
    if (period === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().slice(0, 10);
        const r = registrations.find((reg) => reg.date === ds);
        const row: Record<string, number | string> = {
          label: DAY_LABELS[d.getDay()],
        };
        DEFAULT_WASTE_CATEGORIES.forEach((c) => {
          row[c.id] =
            r?.entries.find((e) => e.categoryId === c.id)?.weightKg ?? 0;
        });
        return row;
      });
    }
    if (period === "year") {
      // Current year by quarter (Q1-Q4)
      const y = today.getFullYear();
      const cq = Math.floor(today.getMonth() / 3) + 1;
      return Array.from({ length: cq }, (_, qi) => {
        const p = `${y}-Q${qi + 1}`;
        const regs = regsInQuarter(registrations, p);
        const row: Record<string, number | string> = { label: `Q${qi + 1}` };
        DEFAULT_WASTE_CATEGORIES.forEach((c) => {
          row[c.id] = catVal(regs, c.id);
        });
        return row;
      });
    }
    // month mode: last 6 quarters
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() - (5 - i) * 3);
      const p = dateToQuarter(d.toISOString().slice(0, 10));
      const regs = regsInQuarter(registrations, p);
      const [, qStr] = p.split("-");
      const row: Record<string, number | string> = { label: qStr };
      DEFAULT_WASTE_CATEGORIES.forEach((c) => {
        row[c.id] = catVal(regs, c.id);
      });
      return row;
    });
  }, [period, registrations]);

  const maxBarVal = Math.max(
    ...trend.map((row) =>
      DEFAULT_WASTE_CATEGORIES.reduce(
        (s, c) => s + (Number(row[c.id]) || 0),
        0,
      ),
    ),
    1,
  );

  const totals = DEFAULT_WASTE_CATEGORIES.map((c) => ({
    cat: c,
    val: trend.reduce((s, row) => s + (Number(row[c.id]) || 0), 0),
  }))
    .filter((x) => x.val > 0)
    .sort((a, b) => b.val - a.val);

  const grandTotal = totals.reduce((s, t) => s + t.val, 0) || 1;

  const trendLine = trend.map((row) =>
    DEFAULT_WASTE_CATEGORIES.reduce((s, c) => s + (Number(row[c.id]) || 0), 0),
  );
  const maxLine = Math.max(...trendLine, 1);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Header + period picker */}
      <div className="flex items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Statistikk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualisering av avfallsdata
          </p>
        </div>
        <div className="flex bg-card border border-border rounded-xl p-0.5">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3.5 py-1.5 rounded-[9px] text-[12.5px] font-semibold transition-colors",
                period === p
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "week" ? "Uke" : p === "month" ? "6 kvartaler" : "År"}
            </button>
          ))}
        </div>
      </div>

      {/* Stacked bar chart */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Avfall per kategori
        </div>
        <div className="flex gap-3 items-end h-55 relative pl-10">
          {/* Y-axis labels */}
          {[0, 0.5, 1].map((f) => (
            <div
              key={f}
              className="absolute left-0 right-0 flex items-center"
              style={{ bottom: f * 200 + 10 }}
            >
              <span className="text-[10px] text-muted-foreground w-8 text-right pr-1.5">
                {(maxBarVal * f).toFixed(0)}
              </span>
              <div className="flex-1 border-b border-dashed border-border" />
            </div>
          ))}

          {trend.map((row, i) => {
            const rowTotal = DEFAULT_WASTE_CATEGORIES.reduce(
              (s, c) => s + (Number(row[c.id]) || 0),
              0,
            );
            const h = (rowTotal / maxBarVal) * 200;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center relative z-10"
              >
                <div
                  className="w-full flex flex-col justify-end"
                  style={{ height: 200 }}
                >
                  <div
                    className="w-full overflow-hidden rounded-t-[6px] max-w-12 mx-auto"
                    style={{
                      height: h,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {DEFAULT_WASTE_CATEGORIES.filter(
                      (c) => Number(row[c.id]) > 0,
                    ).map((c) => {
                      const ph = (Number(row[c.id]) / rowTotal) * 100;
                      return (
                        <div
                          key={c.id}
                          style={{
                            height: `${ph}%`,
                            background: c.color ?? "var(--primary)",
                            minHeight: ph > 0 ? 1 : 0,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1.5 capitalize">
                  {row.label as string}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3.5 mt-3.5 pt-3 border-t border-border">
          {DEFAULT_WASTE_CATEGORIES.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-1.5 text-xs text-foreground"
            >
              <span
                className="w-2.5 h-2.5 rounded-[3px] inline-block shrink-0"
                style={{ background: c.color ?? "var(--primary)" }}
              />
              {c.label}
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown + trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Breakdown horizontal bars */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">
            Fordeling totalt
          </div>
          {totals.map(({ cat, val }) => (
            <div key={cat.id} className="mb-2.5">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{cat.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {val.toFixed(1)} kg · {((val / grandTotal) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(val / grandTotal) * 100}%`,
                    background: cat.color ?? "var(--primary)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Trend line chart */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3.5">
            Totaltrend
          </div>
          {(() => {
            const w = 400;
            const h = 160;
            const pad = 20;
            const innerW = w - pad * 2;
            const step = innerW / (trendLine.length - 1 || 1);
            const pts = trendLine
              .map(
                (v, i) =>
                  `${pad + i * step},${h - (v / maxLine) * (h - 10) - 4}`,
              )
              .join(" ");
            return (
              <div>
                <div style={{ height: h }}>
                  <svg
                    viewBox={`0 0 ${w} ${h}`}
                    width="100%"
                    height="100%"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="var(--primary)"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--primary)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`0,${h} ${pts} ${w},${h}`}
                      fill="url(#lineFill)"
                      vectorEffect="non-scaling-stroke"
                    />
                    <polyline
                      points={pts}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    {trendLine.map((v, i) => (
                      <circle
                        key={i}
                        cx={pad + i * step}
                        cy={h - (v / maxLine) * (h - 10) - 4}
                        r="3.5"
                        fill="white"
                        stroke="var(--primary)"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                </div>
                <div style={{ position: "relative", height: 20, marginTop: 4 }}>
                  {trend.map((row, i) => (
                    <span
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${((pad + i * step) / w) * 100}%`,
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        color: "var(--muted-foreground)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.label as string}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
