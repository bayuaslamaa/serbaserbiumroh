"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Search } from "lucide-react"
import type { HotelBookingSearchParams } from "@/lib/hotel-booking/search"

type Props = {
  initialParams: Partial<HotelBookingSearchParams>
  errors?: string[]
}

type SearchCity = HotelBookingSearchParams["city"]

export function HotelBookingSearchForm({ initialParams, errors = [] }: Props) {
  const router = useRouter()
  const [checkIn, setCheckIn] = useState(initialParams.checkIn ?? "")
  const [checkOut, setCheckOut] = useState(initialParams.checkOut ?? "")
  const [rooms, setRooms] = useState(String(initialParams.rooms ?? 1))
  const [adults, setAdults] = useState(String(initialParams.adults ?? 2))
  const [city, setCity] = useState<SearchCity>(initialParams.city ?? "ALL")
  const [query, setQuery] = useState(initialParams.query ?? "")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (checkIn) params.set("checkIn", checkIn)
    if (checkOut) params.set("checkOut", checkOut)
    params.set("rooms", rooms)
    params.set("adults", adults)
    if (city !== "ALL") params.set("city", city)
    if (query.trim()) params.set("query", query.trim())
    router.push(`/pesan-hotel?${params.toString()}`)
  }

  const inputClass = "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
  const labelClass = "block text-xs font-semibold uppercase tracking-wide mb-1"

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border p-4 space-y-4"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_0.8fr_0.8fr_1fr]">
        <div>
          <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
            Check-in
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className={inputClass}
            style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)", color: "var(--color-text)" }}
          />
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
            Check-out
          </label>
          <input
            type="date"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className={inputClass}
            style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)", color: "var(--color-text)" }}
          />
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
            Kamar
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={rooms}
            onChange={(event) => setRooms(event.target.value)}
            className={inputClass}
            style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)", color: "var(--color-text)" }}
          />
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
            Dewasa
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={adults}
            onChange={(event) => setAdults(event.target.value)}
            className={inputClass}
            style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)", color: "var(--color-text)" }}
          />
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--color-text-muted)" }}>
            Kota
          </label>
          <select
            value={city}
            onChange={(event) => setCity(event.target.value as SearchCity)}
            className={inputClass}
            style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)", color: "var(--color-text)" }}
          >
            <option value="ALL">Semua</option>
            <option value="MAKKAH">Makkah</option>
            <option value="MADINAH">Madinah</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama hotel..."
          className={inputClass}
          style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)", color: "var(--color-text)" }}
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--color-gold)", color: "#1a1206" }}
        >
          <Search className="h-4 w-4" />
          Cari Hotel
        </button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}>
          {errors.join("; ")}
        </div>
      )}
    </form>
  )
}
