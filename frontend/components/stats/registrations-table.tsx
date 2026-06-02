"use client";

import "@toolbox-web/grid";
import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { Lock, ClipboardList } from "lucide-react";
import { DataGrid } from "@toolbox-web/grid-react";
import { useWasteRegistrations } from "@/hooks/use-waste-registrations";
import { useReports } from "@/hooks/use-reports";
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories";
import { dateToQuarter, quarterLabel } from "@/lib/quarters";
import { cn } from "@/lib/utils";

function fmtDay(dateStr: string): string {
  const days = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
  const [y, m, d] = dateStr.split("-").map(Number);
  return days[new Date(y, m - 1, d).getDay()];
}

function hdr(label: string): string {
  return `<span style="text-transform:uppercase;font-size:11px;letter-spacing:0.05em;font-weight:600;color:var(--muted-foreground)">${label}</span>`;
}

type GridRow = {
  id: string;
  date: string;
  day: string;
  total: number;
  locked: boolean;
  [key: string]: unknown;
};

export function RegistrationsTable() {
  const { registrations } = useWasteRegistrations();
  const { isPeriodLocked } = useReports();
  const [filter, setFilter] = useState("all");

  const periods = Array.from(
    new Set(registrations.map((r) => dateToQuarter(r.date))),
  ).sort((a, b) => b.localeCompare(a));

  const filtered =
    filter === "all"
      ? registrations
      : registrations.filter((r) => dateToQuarter(r.date) === filter);

  const rows = useMemo<GridRow[]>(
    () =>
      filtered.slice(0, 60).map((r) => ({
        id: r.id,
        date: r.date,
        day: fmtDay(r.date),
        total: r.entries.reduce((s, e) => s + e.weightKg, 0),
        locked: isPeriodLocked(r.date),
        ...Object.fromEntries(
          DEFAULT_WASTE_CATEGORIES.map((c) => [
            c.id,
            r.entries.find((e) => e.categoryId === c.id)?.weightKg ?? 0,
          ]),
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<any[]>(
    () => [
      {
        field: "date",
        header: "Dato",
        resizable: false,
        width: 70,
        headerLabelRenderer: () => hdr("Dato"),
        renderer: ({ value }: { value: string }) =>
          `<span style="font-weight:600;white-space:nowrap">${format(parseISO(value), "d. MMM", { locale: nb })}</span>`,
      },
      {
        field: "day",
        header: "Dag",
        resizable: false,
        width: 50,
        headerLabelRenderer: () => hdr("Dag"),
        renderer: ({ value }: { value: string }) =>
          `<span style="color:var(--muted-foreground)">${value}</span>`,
      },
      ...DEFAULT_WASTE_CATEGORIES.map((c) => ({
        field: c.id,
        header: c.label,
        type: "number",
        resizable: false,
        minWidth: c.label.length * 9 + 20,
        headerLabelRenderer: () =>
          `<span style="display:flex;align-items:center;gap:6px;justify-content:flex-end;overflow:hidden;text-transform:uppercase;font-size:11px;letter-spacing:0.05em;font-weight:600;color:var(--muted-foreground)">` +
          `<span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block;background:${c.color ?? "var(--primary)"}"></span>` +
          `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.label}</span>` +
          `</span>`,
        renderer: ({ value }: { value: number }) =>
          value > 0
            ? `<span style="display:block;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">${value.toFixed(1)}</span>`
            : `<span style="display:block;text-align:right;color:var(--border)">—</span>`,
      })),
      {
        field: "total",
        header: "Totalt",
        type: "number",
        minWidth: 60,
        resizable: false,
        headerLabelRenderer: () => `
        <span style="text-transform:uppercase;font-size:11px;display:flex;justify-content:flex-end;letter-spacing:0.05em;font-weight:600;color:var(--muted-foreground)">
        <span>Totalt</span>
        </span>
        `,
        renderer: ({ value }: { value: number }) =>
          `<span style="display:block;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap">${value.toFixed(1)}</span>`,
      },
      {
        field: "locked",
        header: "Status",
        resizable: false,
        minWidth: 60,
        headerLabelRenderer: () => `
        <span style="text-transform:uppercase;font-size:11px;display:flex;justify-content:flex-end;letter-spacing:0.05em;font-weight:600;color:var(--muted-foreground)">
        <span>Status</span>
        </span>
        `,
        renderer: ({ value }: { value: boolean }) =>
          value
            ? `<span style="display:flex;justify-content:flex-end;font-size:10.5px;font-weight:700;color:var(--primary)">🔒 LÅST</span>`
            : `<span style="display:flex;justify-content:flex-end;font-size:11px;color:var(--muted-foreground)">Åpen</span>`,
      },
    ],
    [],
  );

  if (registrations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <ClipboardList className="size-10 opacity-30" />
        <p className="text-sm">Ingen registreringer ennå.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Period filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
            filter === "all"
              ? "bg-card border-border text-foreground font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
          )}
        >
          Alle
        </button>
        {periods.map((p) => {
          const locked = isPeriodLocked(p);
          return (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border capitalize",
                filter === p
                  ? "bg-card border-border text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {quarterLabel(p)}
              {locked && <Lock className="size-2.5 text-primary" />}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} rader
      </div>

      <div className="bg-card rounded-xl overflow-hidden">
        <DataGrid
          rows={rows}
          columns={columns}
          sortable={false}
          filterable={false}
          fitMode="stretch"
          style={{ width: "100%" }}
         
        />
        {filtered.length > 60 && (
          <div className="px-3 py-2.5 text-xs text-muted-foreground text-center border-t border-border">
            Viser 60 av {filtered.length}
          </div>
        )}
      </div>
    </div>
  );
}
