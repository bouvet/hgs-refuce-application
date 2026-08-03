"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories";
import type { WasteRegistration } from "@/lib/types";

function fmtDay(dateStr: string): string {
  const days = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
  const [y, m, d] = dateStr.split("-").map(Number);
  return days[new Date(y, m - 1, d).getDay()];
}

type HistoryItemProps = {
  registration: WasteRegistration;
  isLast: boolean;
};

export function HistoryItem({ registration: r, isLast }: HistoryItemProps) {
  const total = r.entries.reduce((s, e) => s + e.weightKg, 0);
  const topEntries = [...r.entries]
    .filter((e) => e.weightKg > 0)
    .sort((a, b) => b.weightKg - a.weightKg);

  return (
    <Link
      href={`/registrer?dato=${r.date}`}
      className={`flex items-center gap-2.5 px-3.5 py-3 ${
        isLast ? "" : "border-b border-border"
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
                {cat.label.split("/")[0].split("-")[0]} {e.weightKg.toFixed(1)}
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
    </Link>
  );
}
