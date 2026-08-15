"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type HotelListingFormProps = {
  initialData?: {
    id: string
    slug: string
    name: string
    city: string
    tier: string
    distanceMeters: number | null
    facilities: string
    pilgrimNotes: string
    isPublished: boolean
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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

export function HotelListingForm({ initialData }: HotelListingFormProps) {
  const isEdit = !!initialData
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(initialData?.name ?? "")
  const [slug, setSlug] = useState(initialData?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [city, setCity] = useState(initialData?.city ?? "MAKKAH")
  const [tier, setTier] = useState(initialData?.tier ?? "STANDARD")
  const [distanceMeters, setDistanceMeters] = useState(
    initialData?.distanceMeters?.toString() ?? ""
  )
  const [facilities, setFacilities] = useState(initialData?.facilities ?? "")
  const [pilgrimNotes, setPilgrimNotes] = useState(initialData?.pilgrimNotes ?? "")
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false)

  const [error, setError] = useState<string | null>(null)

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) {
      setSlug(generateSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    setSlug(value)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      slug,
      name,
      city,
      tier,
      distanceMeters: distanceMeters ? parseInt(distanceMeters) : null,
      facilities,
      pilgrimNotes,
      isPublished,
    }

    startTransition(async () => {
      try {
        const url = isEdit
          ? `/api/admin/hotels/${initialData!.id}`
          : "/api/admin/hotels"
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

        router.push("/admin/content/hotels")
        router.refresh()
      } catch {
        setError("Terjadi kesalahan jaringan.")
      }
    })
  }

  const inputClass =
    "w-full px-3 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
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

      {/* Basic info */}
      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--color-gold)" }}>
          Informasi Hotel
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass} style={labelStyle}>
              Nama Hotel *
            </label>
            <input
              type="text"
              className={inputClass}
              style={inputStyle}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="contoh: Dar Al Tawhid Intercontinental"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass} style={labelStyle}>
              Slug *
            </label>
            <input
              type="text"
              className={inputClass}
              style={inputStyle}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              placeholder="dar-al-tawhid-intercontinental"
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Kota *
            </label>
            <select
              className={inputClass}
              style={inputStyle}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            >
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Tier Hotel *
            </label>
            <select
              className={inputClass}
              style={inputStyle}
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              required
            >
              {HOTEL_TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>
              Jarak ke Masjid (meter)
            </label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={distanceMeters}
              onChange={(e) => setDistanceMeters(e.target.value)}
              min={0}
              placeholder="contoh: 300"
            />
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--color-gold)" }}>
          Fasilitas & Catatan
        </h2>

        <div>
          <label className={labelClass} style={labelStyle}>
            Fasilitas (pisahkan dengan koma)
          </label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const }}
            value={facilities}
            onChange={(e) => setFacilities(e.target.value)}
            placeholder="contoh: WiFi Gratis, Kolam Renang, Restoran, Laundry"
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>
            Catatan untuk Jamaah
          </label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 120, resize: "vertical" as const }}
            value={pilgrimNotes}
            onChange={(e) => setPilgrimNotes(e.target.value)}
            placeholder="Informasi penting bagi jamaah tentang hotel ini..."
          />
        </div>
      </section>

      {/* Publish settings */}
      <section
        className="rounded-lg border p-6 space-y-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--color-gold)" }}>
          Pengaturan Publikasi
        </h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm" style={{ color: "var(--color-text)" }}>
            Publikasikan hotel (tampil di halaman publik)
          </span>
        </label>
      </section>

      {/* Action buttons */}
      <div className="flex items-center gap-4 pb-8">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-md text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "var(--color-gold)", color: "#1a1206" }}
        >
          {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Hotel"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/content/hotels")}
          className="px-4 py-2.5 rounded-md text-sm transition-opacity hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          Batal
        </button>
      </div>
    </form>
  )
}
