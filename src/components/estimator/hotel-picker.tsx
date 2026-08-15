"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/shared/utils"
import type { HotelOptionConfig, HotelTier, RoomType } from "@/shared/types"
import { resolveMonthlyHotelSar, sarLabel } from "@/shared/estimate/hotel-pricing"

interface HotelPickerProps {
  hotels: HotelOptionConfig[]
  selectedId: string | undefined
  travelMonth: number | undefined
  // The rate shown per hotel is the one this room type will actually be charged, so the badge
  // matches the breakdown. Optional: an omitted type resolves on the quad basis, as before.
  roomType?: RoomType
  onSelect: (id: string) => void
}

const TIER_FILTERS: { value: HotelTier | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua" },
  { value: "PELATARAN", label: "Pelataran" },
  { value: "PREMIUM", label: "Premium" },
  { value: "STANDARD", label: "Standard" },
  { value: "ECONOMY", label: "Ekonomi" },
]

const PRICE_THRESHOLD_SAR = 300

export function HotelPicker({ hotels, selectedId, travelMonth, roomType, onSelect }: HotelPickerProps) {
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<HotelTier | "ALL">("ALL")
  const [priceFilterActive, setPriceFilterActive] = useState(false)

  const selectedHotel = hotels.find((hotel) => hotel.id === selectedId)

  const query = search.trim().toLowerCase()

  const matches = (hotel: HotelOptionConfig): boolean => {
    if (tierFilter !== "ALL" && hotel.tier !== tierFilter) return false
    if (priceFilterActive && resolveMonthlyHotelSar(hotel, travelMonth, roomType) > PRICE_THRESHOLD_SAR) return false
    if (query !== "") {
      const haystack = `${hotel.label} ${hotel.sublabel} ${hotel.tier}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  }

  const filtered = hotels.filter((hotel) => hotel.id !== selectedId && matches(hotel))

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <Input
          placeholder="Cari nama hotel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Cari hotel"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIER_FILTERS.map((filter) => {
          const active = tierFilter === filter.value
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTierFilter(filter.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]",
                active
                  ? "border-[var(--color-gold)] bg-[rgba(201,168,76,0.08)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold-muted)]"
              )}
              style={{ color: active ? "var(--color-gold)" : "var(--color-text-muted)" }}
              aria-pressed={active}
            >
              {filter.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setPriceFilterActive((prev) => !prev)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]",
            priceFilterActive
              ? "border-[var(--color-gold)] bg-[rgba(201,168,76,0.08)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold-muted)]"
          )}
          style={{ color: priceFilterActive ? "var(--color-gold)" : "var(--color-text-muted)" }}
          aria-pressed={priceFilterActive}
        >
          ≤ SAR {PRICE_THRESHOLD_SAR}
        </button>
      </div>

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
        {selectedHotel && (
          <HotelRow
            key={selectedHotel.id}
            hotel={selectedHotel}
            selected
            travelMonth={travelMonth}
            roomType={roomType}
            onSelect={onSelect}
          />
        )}

        {filtered.length === 0 && !selectedHotel ? (
          <div
            className="rounded-md border p-4 text-center text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            Tidak ada hotel yang cocok dengan pencarian dan filter Anda.
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-md border p-4 text-center text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            Tidak ada hotel lain yang cocok dengan pencarian dan filter Anda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((hotel) => (
              <HotelRow
                key={hotel.id}
                hotel={hotel}
                selected={false}
                travelMonth={travelMonth}
                roomType={roomType}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HotelRow({
  hotel,
  selected,
  travelMonth,
  roomType,
  onSelect,
}: {
  hotel: HotelOptionConfig
  selected: boolean
  travelMonth: number | undefined
  roomType: RoomType | undefined
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hotel.id)}
      className={cn(
        "rounded-md border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]",
        selected
          ? "border-[var(--color-gold)] bg-[rgba(201,168,76,0.08)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold-muted)]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          {hotel.label}
        </div>
        {selected && (
          <span className="text-[10px] font-semibold" style={{ color: "var(--color-gold)" }}>
            Dipilih
          </span>
        )}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
        {hotel.tier} - {hotel.sublabel}
      </div>
      <div className="text-xs mt-1 font-medium" style={{ color: "var(--color-gold)" }}>
        {sarLabel(resolveMonthlyHotelSar(hotel, travelMonth, roomType))}
      </div>
    </button>
  )
}
