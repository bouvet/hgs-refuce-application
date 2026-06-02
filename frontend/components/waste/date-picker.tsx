"use client"

import { format } from "date-fns"
import { nb } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  date: Date
  onSelect: (date: Date) => void
  disabled?: boolean
}

export function DatePicker({ date, onSelect, disabled }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className={cn("w-full justify-start text-left font-normal h-12")}
          >
            <CalendarIcon className="mr-2 size-4" />
            {format(date, "EEEE d. MMMM yyyy", { locale: nb })}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onSelect(d)}
          disabled={(d) => d > new Date()}
          captionLayout="dropdown"
          locale={nb}
        />
      </PopoverContent>
    </Popover>
  )
}
