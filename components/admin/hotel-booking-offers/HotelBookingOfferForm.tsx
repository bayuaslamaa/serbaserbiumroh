"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type HotelListingOption = {
  id: string
  name: string
  slug: string
  city: string
  tier: string
}

type HotelBookingOfferFormProps = {
  hotelListings: HotelListingOption[]
  initialData?: {
    id: string
    hotelListingId: string | null
    city: string
    tier: string
    hotelName: string
    offerLabel: string
    periodStart: string
    periodEnd: string
    periodLabel: string
    roomBasis: string
    currency: string
    priceAmount: number
    status: string
    notes: string
    terms: string
  }
}

const CITIES = [
  { value: "MAKKAH", label: "Makkah" },
  { value: "MADINAH", label: "Madinah" },
]

const HOTEL_TIERS = [
  { value: "ECONOMY", label: "Economy" },
  { value: "STANDARD", label: "Standard" },
  { value: "PELATARAN", label: "Pelataran" },
  { value: "PREMIUM", label: "Premium" },
]

const STATUSES = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "UNAVAILABLE", label: "Tidak tersedia" },
  { value: "INACTIVE", label: "Arsip" },
]

export function HotelBookingOfferForm({ hotelListings, initialData }: HotelBookingOfferFormProps) {
  const isEdit = !!initialData
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hotelListingId, setHotelListingId] = useState(initialData?.hotelListingId ?? "")
  const [city, setCity] = useState(initialData?.city ?? "MAKKAH")
  const [tier, setTier] = useState(initialData?.tier ?? "STANDARD")
  const [hotelName, setHotelName] = useState(initialData?.hotelName ?? "")
  const [offerLabel, setOfferLabel] = useState(initialData?.offerLabel ?? "")
  const [periodStart, setPeriodStart] = useState(initialData?.periodStart ?? "")
  const [periodEnd, setPeriodEnd] = useState(initialData?.periodEnd ?? "")
  const [periodLabel, setPeriodLabel] = useState(initialData?.periodLabel ?? "")
  const [roomBasis, setRoomBasis] = useState(initialData?.roomBasis ?? "per kamar per malam")
  const [currency, setCurrency] = useState(initialData?.currency ?? "SAR")
  const [priceAmount, setPriceAmount] = useState(initialData?.priceAmount?.toString() ?? "")
  const [status, setStatus] = useState(initialData?.status ?? "ACTIVE")
  const [notes, setNotes] = useState(initialData?.notes ?? "")
  const [terms, setTerms] = useState(initialData?.terms ?? "")

  function handleListingChange(value: string) {
    setHotelListingId(value)
    const listing = hotelListings.find((hotel) => hotel.id === value)
    if (!listing) return
    setHotelName(listing.name)
    setCity(listing.city)
    setTier(listing.tier)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      hotelListingId: hotelListingId || null,
      city,
      tier,
      hotelName,
      offerLabel,
      periodStart,
      periodEnd,
      periodLabel,
      roomBasis,
      currency,
      priceAmount: priceAmount ? parseInt(priceAmount.replace(/,/g, ""), 10) : null,
      status,
      notes,
      terms,
    }

    setIsPending(true)
    try {
      const url = isEdit
        ? `/api/admin/hotel-booking-offers/${initialData!.id}`
        : "/api/admin/hotel-booking-offers"
      const method = isEdit ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Terjadi kesalahan.")
        return
      }

      router.push("/admin/content/hotel-booking-offers")
      router.refresh()
    } catch {
      setError("Terjadi kesalahan jaringan.")
    } finally {
      setIsPending(false)
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
  const inputStyle = {
    borderColor: "var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
  }
  const labelClass = "block text-xs font-semibold uppercase tracking-wide mb-1"
  const labelStyle = { color: "var(--color-text-muted)" }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div
          className="px-4 py-3 rounded-md text-sm"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          {error}
        </div>
      )}

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--color-gold)" }}>
          Informasi Offer
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass} style={labelStyle}>
              Link ke Hotel Nusuk
            </label>
            <select
              className={inputClass}
              style={inputStyle}
              value={hotelListingId}
              onChange={(e) => handleListingChange(e.target.value)}
            >
              <option value="">Tanpa link hotel existing</option>
              {hotelListings.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name} ({hotel.city}, {hotel.tier})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} style={labelStyle}>
              Nama Hotel *
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              required
              maxLength={160}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Kota *
            </label>
            <select className={inputClass} style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Tier *
            </label>
            <select className={inputClass} style={inputStyle} value={tier} onChange={(e) => setTier(e.target.value)}>
              {HOTEL_TIERS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} style={labelStyle}>
              Label Offer
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={offerLabel}
              onChange={(e) => setOfferLabel(e.target.value)}
              maxLength={120}
              placeholder="contoh: Ramadan awal, grup kecil, family room"
            />
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--color-gold)" }}>
          Periode & Harga
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>
              Mulai *
            </label>
            <input
              type="date"
              className={inputClass}
              style={inputStyle}
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Selesai *
            </label>
            <input
              type="date"
              className={inputClass}
              style={inputStyle}
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} style={labelStyle}>
              Label Periode
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
              maxLength={120}
              placeholder="contoh: 15 Feb - 5 Mar 2026"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} style={labelStyle}>
              Basis Kamar *
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={roomBasis}
              onChange={(e) => setRoomBasis(e.target.value)}
              required
              maxLength={120}
              placeholder="per kamar per malam, double"
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Mata Uang
            </label>
            <input
              className={inputClass}
              style={inputStyle}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={8}
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Harga *
            </label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              min={1}
              required
            />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>
              Status
            </label>
            <select className={inputClass} style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--color-gold)" }}>
          Catatan Booking
        </h2>
        <div>
          <label className={labelClass} style={labelStyle}>
            Catatan
          </label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" as const }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={800}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Syarat
          </label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 90, resize: "vertical" as const }}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            maxLength={800}
          />
        </div>
      </section>

      <div className="flex items-center gap-4 pb-8">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-md text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--color-gold)", color: "#1a1206" }}
        >
          {isPending ? "Menyimpan..." : isEdit ? "Simpan Offer" : "Tambah Offer"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/content/hotel-booking-offers")}
          className="px-4 py-2.5 rounded-md text-sm transition-opacity hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          Batal
        </button>
      </div>
    </form>
  )
}
