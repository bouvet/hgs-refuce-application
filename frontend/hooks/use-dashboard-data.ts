"use client";

import { useState } from "react";
import { useWasteRegistrations } from "@/hooks/use-waste-registrations";
import { useReports } from "@/hooks/use-reports";
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories";
import {
  getCurrentQuarter,
  getPastQuarters,
  quarterStartDate,
  quarterEndDate,
  daysLeftInQuarter,
  daysInQuarter,
} from "@/lib/quarters";
import {
  regsInQuarter,
  totalKg,
  catVal,
  daysBetween,
} from "@/lib/waste-utils";
import type { WasteCategory, WasteRegistration, Report } from "@/lib/types";

export type CategoryTotal = {
  cat: WasteCategory;
  val: number;
  delta: number | null;
};

export type DashboardData = {
  registrations: WasteRegistration[];
  quarter: string;
  prevQuarter: string | null;
  today: string;
  // Total card
  totalThis: number;
  totalPrev: number;
  delta: number | null;
  regsThisCount: number;
  trendData: { day: number; kg: number }[];
  // Deadline card
  daysLeft: number;
  pctThrough: number;
  qEnd: string;
  submittedReport: Report | undefined;
  // Last registration card
  lastAgo: number | null;
  lastReg: WasteRegistration | undefined;
  // Category breakdown
  catTotals: CategoryTotal[];
  totalForPct: number;
  // Insights
  anomaly: CategoryTotal | undefined;
};

export function useDashboardData(): DashboardData {
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

  const sortedRegs = [...registrations].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const lastReg = sortedRegs[0];
  const lastAgo = lastReg ? daysBetween(lastReg.date, today) : null;

  const trendData: { day: number; kg: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const r = registrations.find((reg) => reg.date === ds);
    trendData.push({
      day: 29 - i,
      kg: r ? r.entries.reduce((s, e) => s + e.weightKg, 0) : 0,
    });
  }

  const catTotals = DEFAULT_WASTE_CATEGORIES.map((c) => {
    const thisVal = catVal(regsThis, c.id);
    const prevVal = catVal(regsPrev, c.id);
    const prevProrated = prevVal * pctThrough;
    const catDelta =
      prevProrated > 0 ? ((thisVal - prevProrated) / prevProrated) * 100 : null;
    return { cat: c, val: thisVal, delta: catDelta };
  }).filter((x) => x.val > 0);

  const totalForPct =
    catTotals.reduce((s, c) => s + c.val, 0) || 1;

  const anomaly = [...catTotals]
    .filter((c) => c.delta !== null && c.delta > 25)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0];

  const submittedReport = reports.find((r) => r.period === quarter);

  return {
    registrations,
    quarter,
    prevQuarter,
    today,
    totalThis,
    totalPrev,
    delta,
    regsThisCount: regsThis.length,
    trendData,
    daysLeft,
    pctThrough,
    qEnd,
    submittedReport,
    lastAgo,
    lastReg,
    catTotals,
    totalForPct,
    anomaly,
  };
}
