"use client"

import React from "react"
import { format, startOfYear, eachMonthOfInterval, startOfWeek } from "date-fns"
import { nb } from "date-fns/locale"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
  DEFAULT_WASTE_CATEGORIES.flatMap((cat, i) => [
    [cat.id, { label: cat.label, color: COLORS[i] }],
    [`${cat.id}_prev`, { label: `${cat.label} (forrige)`, color: COLORS[i] }],
  ])
)

function sumByCategory(regs: WasteRegistration[], categoryId: string) {
  return regs.reduce(
    (sum, r) => sum + (r.entries.find((e) => e.categoryId === categoryId)?.weightKg ?? 0),
    0
  )
}

function buildData(registrations: WasteRegistration[], period: "week" | "month" | "year") {
  const now = new Date()

  if (period === "week") {
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)
    const lastWeekEnd = new Date(thisWeekStart)
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)

    const thisPeriod = registrations.filter((r) => r.date >= format(thisWeekStart, "yyyy-MM-dd"))
    const prevPeriod = registrations.filter(
      (r) =>
        r.date >= format(lastWeekStart, "yyyy-MM-dd") &&
        r.date <= format(lastWeekEnd, "yyyy-MM-dd")
    )

    return DEFAULT_WASTE_CATEGORIES.map((cat) => ({
      label: cat.label,
      [cat.id]: sumByCategory(thisPeriod, cat.id),
      [`${cat.id}_prev`]: sumByCategory(prevPeriod, cat.id),
    }))
  }

  if (period === "month") {
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const thisPeriod = registrations.filter((r) => r.date >= format(thisMonthStart, "yyyy-MM-dd"))
    const prevPeriod = registrations.filter(
      (r) =>
        r.date >= format(lastMonthStart, "yyyy-MM-dd") &&
        r.date <= format(lastMonthEnd, "yyyy-MM-dd")
    )

    return DEFAULT_WASTE_CATEGORIES.map((cat) => ({
      label: cat.label,
      [cat.id]: sumByCategory(thisPeriod, cat.id),
      [`${cat.id}_prev`]: sumByCategory(prevPeriod, cat.id),
    }))
  }

  // Year: this year vs last year, per month
  const months = eachMonthOfInterval({ start: startOfYear(now), end: now })
  return months.map((monthStart) => {
    const from = format(monthStart, "yyyy-MM-dd")
    const toDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    const to = format(toDate, "yyyy-MM-dd")

    const lastYearMonthStart = new Date(monthStart.getFullYear() - 1, monthStart.getMonth(), 1)
    const lastYearMonthEnd = new Date(monthStart.getFullYear() - 1, monthStart.getMonth() + 1, 0)
    const fromPrev = format(lastYearMonthStart, "yyyy-MM-dd")
    const toPrev = format(lastYearMonthEnd, "yyyy-MM-dd")

    const thisPeriod = registrations.filter((r) => r.date >= from && r.date <= to)
    const prevPeriod = registrations.filter((r) => r.date >= fromPrev && r.date <= toPrev)

    const row: Record<string, number | string> = {
      label: format(monthStart, "MMM", { locale: nb }),
    }
    DEFAULT_WASTE_CATEGORIES.forEach((cat) => {
      row[cat.id] = sumByCategory(thisPeriod, cat.id)
      row[`${cat.id}_prev`] = sumByCategory(prevPeriod, cat.id)
    })
    return row
  })
}

export function WasteComparisonChart({ registrations, period }: Props) {
  const data = buildData(registrations, period)

  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <BarChart data={data} barGap={2} barCategoryGap="30%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} unit=" kg" width={50} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {DEFAULT_WASTE_CATEGORIES.map((cat, i) => (
          <React.Fragment key={cat.id}>
            <Bar dataKey={cat.id} fill={COLORS[i]} radius={[3, 3, 0, 0]} />
            <Bar dataKey={`${cat.id}_prev`} fill={COLORS[i]} fillOpacity={0.35} radius={[3, 3, 0, 0]} />
          </React.Fragment>
        ))}
      </BarChart>
    </ChartContainer>
  )
}
