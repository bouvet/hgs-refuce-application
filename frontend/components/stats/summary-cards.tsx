import { format, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories"
import { categoryIconMap } from "@/lib/category-icons"
import type { WasteRegistration } from "@/lib/types"

function renderIcon(iconName: string) {
  const Icon = categoryIconMap[iconName]
  if (!Icon) return null
  return <Icon className="size-3.5 text-primary/70" />
}

type SummaryCardsProps = {
  registrations: WasteRegistration[]
}

function filterByMonth(registrations: WasteRegistration[], date: Date): WasteRegistration[] {
  const from = format(startOfMonth(date), "yyyy-MM-dd")
  const to = format(endOfMonth(date), "yyyy-MM-dd")
  return registrations.filter((r) => r.date >= from && r.date <= to)
}

function totalKg(regs: WasteRegistration[]): number {
  return regs.reduce((sum, r) => sum + r.entries.reduce((s, e) => s + e.weightKg, 0), 0)
}

function totalByCategoryKg(regs: WasteRegistration[], categoryId: string): number {
  return regs.reduce(
    (sum, r) => sum + (r.entries.find((e) => e.categoryId === categoryId)?.weightKg ?? 0),
    0
  )
}

export function SummaryCards({ registrations }: SummaryCardsProps) {
  const now = new Date()
  const thisMonth = filterByMonth(registrations, now)
  const lastMonth = filterByMonth(registrations, subMonths(now, 1))

  const thisTotal = totalKg(thisMonth)
  const lastTotal = totalKg(lastMonth)
  const delta = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : null

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Totalt denne måneden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <span className="text-3xl md:text-4xl font-bold">{thisTotal.toFixed(1)}</span>
            <span className="text-muted-foreground mb-1">kg</span>
            {delta !== null && (
              <div className={`flex items-center gap-0.5 mb-1 text-sm ${delta < 0 ? "text-green-600" : delta > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {delta < -1 ? <TrendingDown className="size-4" /> : delta > 1 ? <TrendingUp className="size-4" /> : <Minus className="size-4" />}
                <span>{Math.abs(delta).toFixed(0)}% vs forrige måned</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {thisMonth.length} registrering{thisMonth.length !== 1 ? "er" : ""}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {DEFAULT_WASTE_CATEGORIES.map((cat) => {
          const kg = totalByCategoryKg(thisMonth, cat.id)
          return (
            <Card key={cat.id}>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  {cat.icon && categoryIconMap[cat.icon] && renderIcon(cat.icon)}
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <span className="text-xl md:text-2xl font-semibold">{kg.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground ml-1">kg</span>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
