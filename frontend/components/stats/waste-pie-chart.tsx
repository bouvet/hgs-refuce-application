"use client"

import { format, startOfYear, eachMonthOfInterval } from "date-fns"
import { PieChart, Pie, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories"
import type { WasteRegistration } from "@/lib/types"

type Props = {
  registrations: WasteRegistration[]
  period: "week" | "month" | "year"
}

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
]

const chartConfig: ChartConfig = Object.fromEntries(
  DEFAULT_WASTE_CATEGORIES.map((cat, i) => [
    cat.id,
    { label: cat.label, color: COLORS[i] },
  ])
)

function filterByPeriod(registrations: WasteRegistration[], period: "week" | "month" | "year") {
  const now = new Date()

  if (period === "week") {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 6)
    const from = format(cutoff, "yyyy-MM-dd")
    return registrations.filter((r) => r.date >= from)
  }

  if (period === "month") {
    const months = eachMonthOfInterval({
      start: new Date(now.getFullYear(), now.getMonth() - 11, 1),
      end: now,
    })
    const from = format(months[0], "yyyy-MM-dd")
    return registrations.filter((r) => r.date >= from)
  }

  const from = format(startOfYear(now), "yyyy-MM-dd")
  return registrations.filter((r) => r.date >= from)
}

export function WastePieChart({ registrations, period }: Props) {
  const filtered = filterByPeriod(registrations, period)

  const data = DEFAULT_WASTE_CATEGORIES.map((cat, i) => ({
    id: cat.id,
    name: cat.label,
    value: filtered.reduce(
      (sum, r) => sum + (r.entries.find((e) => e.categoryId === cat.id)?.weightKg ?? 0),
      0
    ),
    fill: COLORS[i],
  })).filter((d) => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
        Ingen data for valgt periode
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="45%"
          outerRadius="75%"
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.id} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  )
}
