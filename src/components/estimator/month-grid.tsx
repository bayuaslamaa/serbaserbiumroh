"use client"

import { MONTH_LABELS } from "@/shared/estimate/months"

interface MonthGridProps {
  value: number | undefined
  onChange: (month: number | undefined) => void
}

/**
 * Standalone, responsive month picker grid. Extracted from ParamsPanel.tsx's
 * inline month section: clicking the currently-selected month deselects it
 * (`travelMonth` becomes `undefined`), matching that component's existing
 * toggle behavior.
 */
export function MonthGrid({ value, onChange }: MonthGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
      {MONTH_LABELS.map((label, i) => {
        const month = i + 1
        const isSelected = value === month
        return (
          <button
            key={month}
            type="button"
            onClick={() => onChange(isSelected ? undefined : month)}
            aria-pressed={isSelected}
            className="min-h-[44px] text-xs py-1.5 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
            style={{
              borderColor: isSelected ? "var(--color-gold)" : "var(--color-border)",
              background: isSelected ? "rgba(201,168,76,0.15)" : "transparent",
              color: isSelected ? "var(--color-gold)" : "var(--color-text-muted)",
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
