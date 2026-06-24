"use client";

import { Area, AreaChart } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";

type TrendSparklineProps = {
  data: { day: number; kg: number }[];
};

const chartConfig: ChartConfig = {
  kg: { label: "kg", color: "var(--color-primary)" },
};

export function TrendSparkline({ data }: TrendSparklineProps) {
  return (
    <ChartContainer config={chartConfig} className="!aspect-auto h-14 w-full">
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Area
          type="linear"
          dataKey="kg"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="var(--color-primary)"
          fillOpacity={0.15}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
