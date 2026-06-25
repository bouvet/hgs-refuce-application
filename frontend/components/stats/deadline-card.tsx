"use client";

import { Check } from "lucide-react";
import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Report } from "@/lib/types";

type DeadlineCardProps = {
  submittedReport: Report | undefined;
  daysLeft: number;
  pctThrough: number;
  qEnd: string;
};

const chartConfig: ChartConfig = {
  progress: { label: "Fremgang", color: "var(--color-primary)" },
};

export function DeadlineCard({
  submittedReport,
  daysLeft,
  pctThrough,
  qEnd,
}: DeadlineCardProps) {
  const pct = Math.round(pctThrough * 100);

  return (
    <Card size="sm" className="rounded-2xl shadow-xs">
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Innleveringsfrist
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submittedReport ? (
          <div className="flex items-center gap-3 mt-1">
            <div className="w-8 h-8 rounded-[9px] bg-secondary flex items-center justify-center shrink-0">
              <Check className="size-4.5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">Innlevert</div>
              <div className="text-xs text-muted-foreground">
                {new Date(submittedReport.submittedAt).toLocaleDateString(
                  "nb-NO",
                  { day: "numeric", month: "long", year: "numeric" },
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-4xl font-bold tabular-nums leading-none">
                {daysLeft}
              </span>
              <span className="text-sm text-muted-foreground">dager igjen</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Frist:{" "}
              {new Date(qEnd).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "long",
              })}
            </div>
            <div className="mt-3">
              <ChartContainer
                config={chartConfig}
                className="!aspect-auto h-16 w-16"
              >
                <RadialBarChart
                  data={[{ progress: pct }]}
                  startAngle={90}
                  endAngle={90 - 360 * pctThrough}
                  innerRadius={24}
                  outerRadius={32}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <RadialBar
                    dataKey="progress"
                    background={{ fill: "var(--border)" }}
                    cornerRadius={4}
                    fill="var(--color-primary)"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`${value}%`, "Fremgang"]}
                      />
                    }
                  />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="currentColor"
                    fontSize={10}
                    fontWeight={700}
                  >
                    {pct}%
                  </text>
                </RadialBarChart>
              </ChartContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
