"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { CategoryTotal } from "@/hooks/use-dashboard-data";

type CategoryBreakdownCardProps = {
  catTotals: CategoryTotal[];
  totalForPct: number;
};

export function CategoryBreakdownCard({
  catTotals,
  totalForPct,
}: CategoryBreakdownCardProps) {
  const chartConfig: ChartConfig = Object.fromEntries(
    catTotals.map(({ cat }) => [
      cat.id,
      { label: cat.label, color: cat.color ?? "var(--color-primary)" },
    ]),
  );

  const chartData = [
    Object.fromEntries(catTotals.map(({ cat, val }) => [cat.id, val])),
  ];

  return (
    <Card size="sm" className="rounded-2xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Fordeling
        </CardTitle>
        <CardAction>
          <span className="text-xs text-muted-foreground">
            {totalForPct.toFixed(1)} kg
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="!aspect-auto h-8 w-full"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            barSize={32}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis type="number" domain={[0, totalForPct]} hide />
            <YAxis type="category" hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)} kg`,
                    chartConfig[name as string]?.label ?? name,
                  ]}
                />
              }
            />
            {catTotals.map(({ cat }) => (
              <Bar
                key={cat.id}
                dataKey={cat.id}
                stackId="a"
                fill={cat.color ?? "var(--color-primary)"}
                radius={
                  cat.id === catTotals[0].cat.id
                    ? [4, 0, 0, 4]
                    : cat.id === catTotals[catTotals.length - 1].cat.id
                      ? [0, 4, 4, 0]
                      : 0
                }
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartContainer>
        <div className="mt-3 divide-y divide-border">
          {catTotals.map(({ cat, val, delta }) => (
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
              {delta !== null && (
                <span
                  className={`text-[11px] font-semibold w-12 text-right whitespace-nowrap ${
                    Math.abs(delta) < 5
                      ? "text-muted-foreground"
                      : delta > 0
                        ? "text-red-600"
                        : "text-primary"
                  }`}
                >
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
