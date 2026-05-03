"use client"

import type { EstimateParams, PricingConfig } from "@/types"
import { RadioCardGrid } from "./RadioCardGrid"
import { Stepper } from "./Stepper"
import { ServiceCheckboxGrid } from "./ServiceCheckboxGrid"

interface ParamsPanelProps {
  params: EstimateParams
  pricing: PricingConfig
  onChange: (patch: Partial<EstimateParams>) => void
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]

function sarLabel(amount: number): string {
  return `SAR ${amount}/mlm`
}

function resolveMonthlyHotelSar(
  config: { sarPerNight: number; monthlyPrices: Record<number, number> },
  month?: number
): number {
  if (month != null && config.monthlyPrices[month] != null) return config.monthlyPrices[month]
  return config.sarPerNight
}

export function ParamsPanel({ params, pricing, onChange }: ParamsPanelProps) {
  const hotelOptions = (["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const).map((tier) => ({
    value: tier,
    label: pricing.hotels.MAKKAH[tier].label,
    sublabel: pricing.hotels.MAKKAH[tier].sublabel,
    badge: `${sarLabel(resolveMonthlyHotelSar(pricing.hotels.MAKKAH[tier], params.travelMonth))} Makkah`,
  }))

  const roomOptions = (["QUAD", "TRIPLE", "DOUBLE", "SINGLE"] as const).map((rt) => {
    const rm = pricing.roomMultipliers[rt]
    return {
      value: rt,
      label: rt.charAt(0) + rt.slice(1).toLowerCase(),
      sublabel: `${rm.paxPerRoom} orang/kamar`,
      badge: `×${rm.multiplier}`,
    }
  })

  const airlineOptions = (["BUDGET", "STANDARD", "GARUDA", "BUSINESS"] as const).map((a) => ({
    value: a,
    label: pricing.airlines[a].label,
    badge: `Rp ${(pricing.airlines[a].idr / 1_000_000).toFixed(1)}jt`,
  }))

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-6"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <h2
        className="text-lg font-bold"
        style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
      >
        Detail Perjalanan
      </h2>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Jumlah Malam
        </h3>
        <Stepper label="Madinah" value={params.nightsMadinah} onChange={(v) => onChange({ nightsMadinah: v })} min={1} max={30} />
        <Stepper label="Makkah" value={params.nightsMakkah} onChange={(v) => onChange({ nightsMakkah: v })} min={1} max={30} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Jumlah Peserta
        </h3>
        <Stepper value={params.pax} onChange={(v) => onChange({ pax: v })} min={1} max={200} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Bulan Keberangkatan
        </h3>
        <div className="grid grid-cols-6 gap-1.5">
          {MONTH_LABELS.map((label, i) => {
            const month = i + 1
            const isSelected = params.travelMonth === month
            return (
              <button
                key={month}
                type="button"
                onClick={() => onChange({ travelMonth: isSelected ? undefined : month })}
                className="text-xs py-1.5 rounded border transition-colors"
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
        {params.travelMonth == null && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Pilih bulan untuk harga musiman yang akurat
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Kategori Hotel
        </h3>
        <RadioCardGrid
          options={hotelOptions}
          value={params.hotelTier}
          onChange={(v) => onChange({ hotelTier: v as EstimateParams["hotelTier"] })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Tipe Kamar
        </h3>
        <RadioCardGrid
          options={roomOptions}
          value={params.roomType}
          onChange={(v) => onChange({ roomType: v as EstimateParams["roomType"] })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Maskapai
        </h3>
        <RadioCardGrid
          options={airlineOptions}
          value={params.airline}
          onChange={(v) => onChange({ airline: v as EstimateParams["airline"] })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          Layanan Tambahan
        </h3>
        <ServiceCheckboxGrid
          pricing={pricing}
          value={params.services}
          onChange={(services) => onChange({ services })}
        />
      </section>

      <section className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={params.fullboard}
            onChange={(e) => onChange({ fullboard: e.target.checked })}
            className="w-4 h-4 accent-[var(--color-gold)]"
          />
          <span className="text-sm" style={{ color: "var(--color-text)" }}>
            Full Board (3x makan/hari)
          </span>
        </label>
      </section>
    </div>
  )
}
