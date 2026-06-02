"use client"

import { format, parseISO } from "date-fns"
import { nb } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { DEFAULT_WASTE_CATEGORIES } from "@/lib/data/waste-categories"
import type { WasteRegistration } from "@/lib/types"

type RegistrationCardProps = {
  registration: WasteRegistration
}

export function RegistrationCard({ registration }: RegistrationCardProps) {
  const router = useRouter()

  const totalKg = registration.entries.reduce((sum, e) => sum + e.weightKg, 0)
  const dateLabel = format(parseISO(registration.date), "EEEE d. MMMM yyyy", { locale: nb })

  function handleClick() {
    router.push(`/registrer?dato=${registration.date}`)
  }

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 hover:shadow-md transition-all duration-200 active:scale-[0.99]"
      onClick={handleClick}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm md:text-base font-medium capitalize">{dateLabel}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{totalKg.toFixed(1)} kg totalt</p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {registration.entries
            .filter((e) => e.weightKg > 0)
            .map((entry) => {
              const cat = DEFAULT_WASTE_CATEGORIES.find((c) => c.id === entry.categoryId)
              return (
                <Badge key={entry.categoryId} variant="secondary" className="text-xs">
                  {cat?.label ?? entry.categoryId}: {entry.weightKg.toFixed(1)} kg
                </Badge>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
}
