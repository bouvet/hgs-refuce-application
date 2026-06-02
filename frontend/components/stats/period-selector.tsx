"use client"

type Period = "week" | "month" | "year"

type PeriodSelectorProps = {
  value: Period
  onChange: (period: Period) => void
}

const options: { label: string; value: Period }[] = [
  { label: "Uke", value: "week" },
  { label: "Måned", value: "month" },
  { label: "År", value: "year" },
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden w-fit">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
