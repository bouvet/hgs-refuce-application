import { quarterStartDate, quarterEndDate } from "@/lib/quarters";
import type { WasteRegistration } from "@/lib/types";

export function regsInQuarter(
  regs: WasteRegistration[],
  quarter: string,
): WasteRegistration[] {
  const start = quarterStartDate(quarter);
  const end = quarterEndDate(quarter);
  return regs.filter((r) => r.date >= start && r.date <= end);
}

export function totalKg(regs: WasteRegistration[]): number {
  return regs.reduce(
    (s, r) => s + r.entries.reduce((x, e) => x + e.weightKg, 0),
    0,
  );
}

export function catVal(regs: WasteRegistration[], catId: string): number {
  return regs.reduce(
    (s, r) =>
      s + (r.entries.find((e) => e.categoryId === catId)?.weightKg ?? 0),
    0,
  );
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86400000,
  );
}
