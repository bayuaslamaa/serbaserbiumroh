"use client"

import type { PricingConfig, ServiceKey } from "@/types"

interface ServiceCheckboxGridProps {
  pricing: PricingConfig
  value: ServiceKey[]
  onChange: (services: ServiceKey[]) => void
}

function formatAmount(currency: string, amount: number): string {
  if (currency === "USD") return `$${amount}`
  if (currency === "SAR") return `SAR ${amount}`
  return `Rp ${amount.toLocaleString("id-ID")}`
}

const SERVICE_ORDER: ServiceKey[] = [
  "VISA",
  "SISKOPATUH",
  "TRANSPORT_JED_MAKKAH",
  "TASREH",
  "TOUR_MAKKAH",
  "TOUR_MADINAH",
]

export function ServiceCheckboxGrid({ pricing, value, onChange }: ServiceCheckboxGridProps) {
  function toggle(key: ServiceKey) {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key))
    } else {
      onChange([...value, key])
    }
  }

  const enabledServices = SERVICE_ORDER.filter((key) => pricing.services[key]?.enabled)

  return (
    <div className="flex flex-col gap-2">
      {enabledServices.map((key) => {
        const svc = pricing.services[key]
        const checked = value.includes(key)
        return (
          <label
            key={key}
            className="flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors"
            style={{
              borderColor: checked ? "var(--color-gold)" : "var(--color-border)",
              background: checked ? "rgba(201,168,76,0.06)" : "var(--color-surface)",
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(key)}
              className="w-4 h-4 accent-[var(--color-gold)]"
            />
            <span className="flex-1 text-sm" style={{ color: "var(--color-text)" }}>
              {svc.label}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {formatAmount(svc.currency, svc.amount)}
            </span>
          </label>
        )
      })}
    </div>
  )
}
