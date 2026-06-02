"use client"

import { format, parseISO, startOfYear, eachMonthOfInterval } from "date-fns"
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

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"]

const chartConfig: ChartConfig = Object.fromEntries(
  DEFAULT_WASTE_CATEGORIES.map((cat, i) => [
    cat.id,
    { label: cat.label, color: COLORS[i] },
  ])
)

function buildData(registrations: WasteRegistration[], period: "week" | "month" | "year") {
  const now = new Date()

  if (period === "week") {
    // Last 7 days grouped by day
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      return format(d, "yyyy-MM-dd")
    })
    return days.map((dateStr) => {
      const reg = registrations.find((r) => r.date === dateStr)
      const row: Record<string, number | string> = {
        label: format(parseISO(dateStr), "EEE", { locale: nb }),
      }
      DEFAULT_WASTE_CATEGORIES.forEach((cat) => {
        row[cat.id] = reg?.entries.find((e) => e.categoryId === cat.id)?.weightKg ?? 0
      })
      return row
    })
  }

  if (period === "month") {
    // Last 12 months
    const months = eachMonthOfInterval({
      start: new Date(now.getFullYear(), now.getMonth() - 11, 1),
      end: now,
    })
    return months.map((monthStart) => {
      const from = format(monthStart, "yyyy-MM-dd")
      const toDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      const to = format(toDate, "yyyy-MM-dd")
      const regs = registrations.filter((r) => r.date >= from && r.date <= to)
      const row: Record<string, number | string> = {
        label: format(monthStart, "MMM", { locale: nb }),
      }
      DEFAULT_WASTE_CATEGORIES.forEach((cat) => {
        row[cat.id] = regs.reduce(
          (sum, r) => sum + (r.entries.find((e) => e.categoryId === cat.id)?.weightKg ?? 0),
          0
        )
      })
      return row
    })
  }

  // Year: group by month within this year
  const yearStart = startOfYear(now)
  const months = eachMonthOfInterval({ start: yearStart, end: now })
  return months.map((monthStart) => {
    const from = format(monthStart, "yyyy-MM-dd")
    const toDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    const to = format(toDate, "yyyy-MM-dd")
    const regs = registrations.filter((r) => r.date >= from && r.date <= to)
    const row: Record<string, number | string> = {
      label: format(monthStart, "MMM", { locale: nb }),
    }
    DEFAULT_WASTE_CATEGORIES.forEach((cat) => {
      row[cat.id] = regs.reduce(
        (sum, r) => sum + (r.entries.find((e) => e.categoryId === cat.id)?.weightKg ?? 0),
        0
      )
    })
    return row
  })
}

export function WasteBarChart({ registrations, period }: Props) {
  const data = buildData(registrations, period)

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} unit=" kg" width={50} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {DEFAULT_WASTE_CATEGORIES.map((cat, i) => (
          <Bar key={cat.id} dataKey={cat.id} stackId="a" fill={COLORS[i]} radius={i === DEFAULT_WASTE_CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
