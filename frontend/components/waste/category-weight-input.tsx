import { Input } from "@/components/ui/input"
import type { WasteCategory } from "@/lib/types"

type CategoryWeightInputProps = {
  category: WasteCategory
  value: string
  onChange: (categoryId: string, value: string) => void
}

export function CategoryWeightInput({ category, value, onChange }: CategoryWeightInputProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <label htmlFor={`weight-${category.id}`} className="text-sm font-medium flex-1">
        {category.label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={`weight-${category.id}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          placeholder="0.0"
          value={value}
          onChange={(e) => onChange(category.id, e.target.value)}
          className="w-24 h-11 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-sm text-muted-foreground w-4">kg</span>
      </div>
    </div>
  )
}
