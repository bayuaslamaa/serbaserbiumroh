"use client"

import { cn } from "@/lib/utils"

interface StepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
}

export function Stepper({ value, onChange, min = 1, max = 999, label }: StepperProps) {
  function clamp(n: number) {
    return Math.min(max, Math.max(min, n))
  }

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-sm w-24 shrink-0" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </span>
      )}
      <div className="flex items-center rounded-md border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center text-lg transition-colors hover:bg-[var(--color-surface)] disabled:opacity-30"
          style={{ color: "var(--color-text)" }}
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label="Kurangi"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value) || min))}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") onChange(clamp(value + 1))
            if (e.key === "ArrowDown") onChange(clamp(value - 1))
          }}
          className={cn(
            "w-12 h-9 text-center text-sm bg-transparent focus:outline-none",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
          style={{ color: "var(--color-text)" }}
        />
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center text-lg transition-colors hover:bg-[var(--color-surface)] disabled:opacity-30"
          style={{ color: "var(--color-text)" }}
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label="Tambah"
        >
          +
        </button>
      </div>
    </div>
  )
}
