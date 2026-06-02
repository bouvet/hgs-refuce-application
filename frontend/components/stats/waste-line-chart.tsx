"use client"

import { format, parseISO, startOfYear, eachMonthOfInterval } from "date-fns"
import { nb } from "date-fns/locale"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { WasteRegistration } from "@/lib/types"

type Props = {
  registrations: WasteRegistration[]
  period: "week" | "month" | "year"
}

const chartConfig: ChartConfig = {
  total: { label: "Totalt avfall", color: "var(--color-primary)" },
}

function buildData(registrations: WasteRegistration[], period: "week" | "month" | "year") {
  const now = new Date()

  if (period === "week") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const dateStr = format(d, "yyyy-MM-dd")
      const reg = registrations.find((r) => r.date === dateStr)
      return {
        label: format(parseISO(dateStr), "EEE", { locale: nb }),
        total: reg ? reg.entries.reduce((sum, e) => sum + e.weightKg, 0) : 0,
      }
    })
  }

  if (period === "month") {
    const months = eachMonthOfInterval({
      start: new Date(now.getFullYear(), now.getMonth() - 11, 1),
      end: now,
    })
    return months.map((monthStart) => {
      const from = format(monthStart, "yyyy-MM-dd")
      const toDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      const to = format(toDate, "yyyy-MM-dd")
      const regs = registrations.filter((r) => r.date >= from && r.date <= to)
      return {
        label: format(monthStart, "MMM", { locale: nb }),
        total: regs.reduce((sum, r) => sum + r.entries.reduce((s, e) => s + e.weightKg, 0), 0),
      }
    })
  }

  const months = eachMonthOfInterval({ start: startOfYear(now), end: now })
  return months.map((monthStart) => {
    const from = format(monthStart, "yyyy-MM-dd")
    const toDate = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    const to = format(toDate, "yyyy-MM-dd")
    const regs = registrations.filter((r) => r.date >= from && r.date <= to)
    return {
      label: format(monthStart, "MMM", { locale: nb }),
      total: regs.reduce((sum, r) => sum + r.entries.reduce((s, e) => s + e.weightKg, 0), 0),
    }
  })
}

export function WasteLineChart({ registrations, period }: Props) {
  const data = buildData(registrations, period)

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} unit=" kg" width={50} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-primary)" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
