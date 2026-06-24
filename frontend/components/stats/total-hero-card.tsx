"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { TrendSparkline } from "@/components/stats/trend-sparkline";

type TotalHeroCardProps = {
  totalKg: number;
  delta: number | null;
  registrationCount: number;
  prevQuarterTotal: number | null;
  trendData: { day: number; kg: number }[];
};

export function TotalHeroCard({
  totalKg,
  delta,
  registrationCount,
  prevQuarterTotal,
  trendData,
}: TotalHeroCardProps) {
  return (
    <Card size="sm" className="rounded-2xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Totalt dette kvartalet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 mt-0.5">
          <span className="text-5xl font-bold tracking-tight tabular-nums leading-none">
            {totalKg.toFixed(1)}
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
          {registrationCount} registreringer
          {prevQuarterTotal !== null
            ? ` · forrige kvartal: ${prevQuarterTotal.toFixed(1)} kg`
            : ""}
        </div>
        <div className="mt-3">
          <TrendSparkline data={trendData} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>30 dager siden</span>
            <span>siste 30 dager</span>
            <span>i dag</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
