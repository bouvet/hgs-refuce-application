"use client"

import { format, parseISO } from "date-fns"
import { nb } from "date-fns/locale"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { WasteRegistration } from "@/lib/types"

type Props = {
  registrations: WasteRegistration[]
}

const chartConfig: ChartConfig = {
  total: { label: "Totalt", color: "var(--color-primary)" },
}

function buildData(registrations: WasteRegistration[]) {
  const now = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = format(d, "yyyy-MM-dd")
    const reg = registrations.find((r) => r.date === dateStr)
    const total = reg ? reg.entries.reduce((sum, e) => sum + e.weightKg, 0) : 0
    return {
      label: format(parseISO(dateStr), "EEE", { locale: nb }),
      total,
    }
  })
}

export function DailyTrendChart({ registrations }: Props) {
  const data = buildData(registrations)

  return (
    <ChartContainer config={chartConfig} className="h-48 w-full">
      <AreaChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} unit=" kg" width={50} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="total"
          fill="var(--color-primary)"
          fillOpacity={0.15}
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
