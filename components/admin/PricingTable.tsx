"use client"

import { Fragment, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type {
  ExchangeRate,
  HotelPrice,
  HotelMonthlyPrice,
  AirlinePrice,
  AirlineMonthlyPrice,
  ServiceFee,
} from "@/lib/db/schema"
import type { HotelPricingImportParseResult } from "@/lib/admin/hotel-pricing-import"
import type { AirlinePricingImportParseResult } from "@/lib/admin/airline-pricing-import"
import { InlineEditCell } from "./InlineEditCell"

type HotelWithMonthly = HotelPrice & { monthlyPrices: HotelMonthlyPrice[] }
type AirlineWithMonthly = AirlinePrice & { monthlyPrices: AirlineMonthlyPrice[] }

interface PricingTableProps {
  rates: ExchangeRate[]
  hotels: HotelWithMonthly[]
  airlines: AirlineWithMonthly[]
  services: ServiceFee[]
}

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]

function formatDate(d: Date | string) {
  return new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function patch(category: string, body: object) {
  const res = await fetch(`/api/admin/pricing/${category}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any)?.error ?? "Gagal menyimpan")
  }
  return res.json()
}

const TABLE_STYLE = {
  borderColor: "var(--color-border)",
  background: "var(--color-surface)",
}

const TH = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
const TD = "px-3 py-2 text-sm"

const CITIES = ["MAKKAH", "MADINAH"] as const
const HOTEL_TIERS = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"] as const
const AIRLINE_TIERS = ["BUDGET", "STANDARD", "GARUDA", "BUSINESS"] as const

type AddHotelForm = {
  city: "MAKKAH" | "MADINAH"
  tier: "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
  label: string
  sublabel: string
  distance: string
  sarPerNight: string
}

type AddAirlineForm = {
  tier: "BUDGET" | "STANDARD" | "GARUDA" | "BUSINESS"
  label: string
  sublabel: string
  idr: string
  isDefault: boolean
}

export function PricingTable({ rates: initialRates, hotels: initialHotels, airlines: initialAirlines, services: initialServices }: PricingTableProps) {
  const router = useRouter()
  const [rates, setRates] = useState(initialRates)
  const [hotels, setHotels] = useState(initialHotels)
  const [airlines, setAirlines] = useState(initialAirlines)
  const [services, setServices] = useState(initialServices)
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [expandedAirlines, setExpandedAirlines] = useState<Set<string>>(new Set())
  const [addHotelOpen, setAddHotelOpen] = useState(false)
  const [addHotelForm, setAddHotelForm] = useState<AddHotelForm>({
    city: "MAKKAH",
    tier: "STANDARD",
    label: "",
    sublabel: "",
    distance: "",
    sarPerNight: "",
  })
  const [addHotelError, setAddHotelError] = useState("")
  const [addHotelLoading, setAddHotelLoading] = useState(false)
  const [addAirlineOpen, setAddAirlineOpen] = useState(false)
  const [addAirlineForm, setAddAirlineForm] = useState<AddAirlineForm>({
    tier: "STANDARD",
    label: "",
    sublabel: "",
    idr: "",
    isDefault: false,
  })
  const [addAirlineError, setAddAirlineError] = useState("")
  const [addAirlineLoading, setAddAirlineLoading] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importCsv, setImportCsv] = useState("")
  const [importPreview, setImportPreview] = useState<HotelPricingImportParseResult | null>(null)
  const [importError, setImportError] = useState("")
  const [importLoading, setImportLoading] = useState(false)
  const [importConfirming, setImportConfirming] = useState(false)
  const [airlineImportOpen, setAirlineImportOpen] = useState(false)
  const [airlineImportCsv, setAirlineImportCsv] = useState("")
  const [airlineImportPreview, setAirlineImportPreview] = useState<AirlinePricingImportParseResult | null>(null)
  const [airlineImportError, setAirlineImportError] = useState("")
  const [airlineImportLoading, setAirlineImportLoading] = useState(false)
  const [airlineImportConfirming, setAirlineImportConfirming] = useState(false)

  useEffect(() => {
    setRates(initialRates)
    setHotels(initialHotels)
    setAirlines(initialAirlines)
    setServices(initialServices)
  }, [initialRates, initialHotels, initialAirlines, initialServices])

  function toggleMonthly(hotelId: string) {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      next.has(hotelId) ? next.delete(hotelId) : next.add(hotelId)
      return next
    })
  }

  function toggleAirlineMonthly(airlineId: string) {
    setExpandedAirlines((prev) => {
      const next = new Set(prev)
      next.has(airlineId) ? next.delete(airlineId) : next.add(airlineId)
      return next
    })
  }

  async function submitAddHotel(e: React.FormEvent) {
    e.preventDefault()
    setAddHotelError("")
    const sarValue = parseInt(addHotelForm.sarPerNight, 10)
    if (!addHotelForm.label.trim()) {
      setAddHotelError("Label wajib diisi")
      return
    }
    if (isNaN(sarValue) || sarValue <= 0) {
      setAddHotelError("SAR/malam harus angka positif")
      return
    }
    setAddHotelLoading(true)
    try {
      const res = await fetch("/api/admin/pricing/hotel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: addHotelForm.city,
          tier: addHotelForm.tier,
          label: addHotelForm.label,
          sublabel: addHotelForm.sublabel,
          distance: addHotelForm.distance,
          sarPerNight: sarValue,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Gagal menyimpan")
      }
      const { hotel, monthlyPrices: mp } = await res.json()
      setHotels((prev) => [...prev, { ...hotel, monthlyPrices: mp }])
      setAddHotelOpen(false)
      setAddHotelForm({ city: "MAKKAH", tier: "STANDARD", label: "", sublabel: "", distance: "", sarPerNight: "" })
    } catch (err: unknown) {
      setAddHotelError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setAddHotelLoading(false)
    }
  }

  async function submitAddAirline(e: React.FormEvent) {
    e.preventDefault()
    setAddAirlineError("")
    const idrValue = parseInt(addAirlineForm.idr, 10)
    if (!addAirlineForm.label.trim()) {
      setAddAirlineError("Label wajib diisi")
      return
    }
    if (isNaN(idrValue) || idrValue <= 0) {
      setAddAirlineError("IDR/orang harus angka positif")
      return
    }
    setAddAirlineLoading(true)
    try {
      const res = await fetch("/api/admin/pricing/airline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: addAirlineForm.tier,
          label: addAirlineForm.label,
          sublabel: addAirlineForm.sublabel,
          idr: idrValue,
          isDefault: addAirlineForm.isDefault,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Gagal menyimpan")
      }
      const { airline, monthlyPrices: mp } = await res.json()
      setAirlines((prev) => [
        ...prev.map((a) =>
          addAirlineForm.isDefault && a.tier === addAirlineForm.tier ? { ...a, isDefault: false } : a
        ),
        { ...airline, monthlyPrices: mp },
      ])
      setAddAirlineOpen(false)
      setAddAirlineForm({ tier: "STANDARD", label: "", sublabel: "", idr: "", isDefault: false })
    } catch (err: unknown) {
      setAddAirlineError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setAddAirlineLoading(false)
    }
  }

  function updateMonthlyPrice(hotelId: string, month: number, sarPerNight: number) {
    setHotels((prev) =>
      prev.map((h) =>
        h.id === hotelId
          ? { ...h, monthlyPrices: h.monthlyPrices.map((mp) => mp.month === month ? { ...mp, sarPerNight } : mp) }
          : h
      )
    )
  }

  function updateAirlineMonthlyPrice(airlineId: string, month: number, idr: number) {
    setAirlines((prev) =>
      prev.map((a) =>
        a.id === airlineId
          ? { ...a, monthlyPrices: a.monthlyPrices.map((mp) => mp.month === month ? { ...mp, idr } : mp) }
          : a
      )
    )
  }

  async function handleImportFile(file: File | null) {
    setImportError("")
    setImportPreview(null)
    if (!file) return
    setImportCsv(await file.text())
  }

  async function previewImport() {
    setImportError("")
    setImportPreview(null)
    if (!importCsv.trim()) {
      setImportError("CSV wajib diisi")
      return
    }

    setImportLoading(true)
    try {
      const res = await fetch("/api/admin/pricing/hotel-import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importCsv }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal membaca CSV")
      setImportPreview(data.preview)
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setImportLoading(false)
    }
  }

  async function confirmImport() {
    setImportError("")
    if (!importPreview || importPreview.summary.create + importPreview.summary.update === 0) {
      setImportError("Tidak ada baris valid untuk diimpor")
      return
    }
    if (importPreview.summary.conflict > 0) {
      setImportError("Selesaikan baris duplikat/konflik sebelum konfirmasi")
      return
    }

    setImportConfirming(true)
    try {
      const res = await fetch("/api/admin/pricing/hotel-import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importCsv }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal mengimpor CSV")
      setImportPreview(data.preview)
      router.refresh()
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setImportConfirming(false)
    }
  }

  async function handleAirlineImportFile(file: File | null) {
    setAirlineImportError("")
    setAirlineImportPreview(null)
    if (!file) return
    setAirlineImportCsv(await file.text())
  }

  async function previewAirlineImport() {
    setAirlineImportError("")
    setAirlineImportPreview(null)
    if (!airlineImportCsv.trim()) {
      setAirlineImportError("CSV wajib diisi")
      return
    }

    setAirlineImportLoading(true)
    try {
      const res = await fetch("/api/admin/pricing/airline-import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: airlineImportCsv }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal membaca CSV")
      setAirlineImportPreview(data.preview)
    } catch (err: unknown) {
      setAirlineImportError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setAirlineImportLoading(false)
    }
  }

  async function confirmAirlineImport() {
    setAirlineImportError("")
    if (!airlineImportPreview || airlineImportPreview.summary.create + airlineImportPreview.summary.update === 0) {
      setAirlineImportError("Tidak ada baris valid untuk diimpor")
      return
    }
    if (airlineImportPreview.summary.conflict > 0) {
      setAirlineImportError("Selesaikan baris duplikat/konflik sebelum konfirmasi")
      return
    }

    setAirlineImportConfirming(true)
    try {
      const res = await fetch("/api/admin/pricing/airline-import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: airlineImportCsv }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Gagal mengimpor CSV")
      setAirlineImportPreview(data.preview)
      router.refresh()
    } catch (err: unknown) {
      setAirlineImportError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setAirlineImportConfirming(false)
    }
  }

  const canConfirmImport =
    !!importPreview &&
    importPreview.summary.conflict === 0 &&
    importPreview.summary.create + importPreview.summary.update > 0
  const canConfirmAirlineImport =
    !!airlineImportPreview &&
    airlineImportPreview.summary.conflict === 0 &&
    airlineImportPreview.summary.create + airlineImportPreview.summary.update > 0

  return (
    <div className="flex flex-col gap-8">
      {/* Exchange Rates */}
      <section>
        <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}>
          Kurs Mata Uang
        </h2>
        <div className="rounded-lg border overflow-hidden" style={TABLE_STYLE}>
          <table className="w-full">
            <thead style={{ background: "rgba(0,0,0,0.2)" }}>
              <tr>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Mata Uang</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Kurs ke IDR</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <td className={TD} style={{ color: "var(--color-text)" }}>{r.currency}</td>
                  <td className={TD}>
                    <InlineEditCell
                      value={r.rateToIdr}
                      type="number"
                      formatter={(v) => `Rp ${Number(v).toLocaleString("id-ID")}`}
                      onSave={async (newVal) => {
                        const { rate } = await patch("rates", { currency: r.currency, rateToIdr: newVal })
                        setRates((prev) => prev.map((x) => x.id === r.id ? rate : x))
                      }}
                    />
                  </td>
                  <td className={TD} style={{ color: "var(--color-text-muted)" }}>{formatDate(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Hotel Prices */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}>
            Harga Hotel (SAR/malam)
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setImportOpen((v) => !v); setImportError(""); setImportPreview(null) }}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{
                borderColor: importOpen ? "var(--color-gold)" : "var(--color-border)",
                color: importOpen ? "var(--color-gold)" : "var(--color-text-muted)",
              }}
            >
              {importOpen ? "Tutup Import" : "Import CSV"}
            </button>
            <button
              onClick={() => { setAddHotelOpen((v) => !v); setAddHotelError("") }}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{
                borderColor: addHotelOpen ? "var(--color-gold)" : "var(--color-border)",
                color: addHotelOpen ? "var(--color-gold)" : "var(--color-text-muted)",
              }}
            >
              {addHotelOpen ? "✕ Batal" : "+ Tambah Hotel"}
            </button>
          </div>
        </div>

        {importOpen && (
          <div
            className="rounded-lg border p-4 mb-3 flex flex-col gap-3"
            style={{ borderColor: "var(--color-border)", background: "rgba(201,168,76,0.04)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>
                  Import Harga Hotel CSV
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Satu baris per hotel. Kolom bulanan kosong akan mengikuti harga dasar.
                </p>
              </div>
              <a
                href="/api/admin/pricing/hotel-import/template"
                className="text-xs px-3 py-1.5 rounded border inline-flex justify-center"
                style={{ borderColor: "var(--color-border)", color: "var(--color-gold)" }}
              >
                Download Template
              </a>
            </div>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            />

            <textarea
              value={importCsv}
              onChange={(e) => { setImportCsv(e.target.value); setImportPreview(null); setImportError("") }}
              placeholder="Tempel isi CSV di sini atau pilih file CSV..."
              className="rounded border px-3 py-2 text-xs font-mono min-h-28 bg-transparent"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />

            {importError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>{importError}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={previewImport}
                disabled={importLoading || importConfirming}
                className="text-sm px-4 py-1.5 rounded border font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
              >
                {importLoading ? "Memeriksa..." : "Preview"}
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={!canConfirmImport || importConfirming || importLoading}
                className="text-sm px-4 py-1.5 rounded border font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: canConfirmImport ? "var(--color-gold)" : "var(--color-border)", color: canConfirmImport ? "var(--color-gold)" : "var(--color-text-muted)" }}
              >
                {importConfirming ? "Mengimpor..." : "Konfirmasi Import"}
              </button>
            </div>

            {importPreview && (
              <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.16)" }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {([
                    ["Baru", importPreview.summary.create],
                    ["Update", importPreview.summary.update],
                    ["Invalid", importPreview.summary.invalid],
                    ["Konflik", importPreview.summary.conflict],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded border px-2 py-2" style={{ borderColor: "var(--color-border)" }}>
                      <div style={{ color: "var(--color-text-muted)" }}>{label}</div>
                      <div className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="max-h-48 overflow-auto text-xs">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr style={{ color: "var(--color-text-muted)" }}>
                        <th className="text-left py-1 pr-2">Baris</th>
                        <th className="text-left py-1 pr-2">Status</th>
                        <th className="text-left py-1 pr-2">Hotel</th>
                        <th className="text-left py-1 pr-2">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row) => (
                        <tr key={row.rowNumber} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                          <td className="py-1 pr-2" style={{ color: "var(--color-text-muted)" }}>{row.rowNumber}</td>
                          <td className="py-1 pr-2 uppercase" style={{ color: row.status === "invalid" || row.status === "conflict" ? "#ef4444" : "var(--color-gold)" }}>
                            {row.status}
                          </td>
                          <td className="py-1 pr-2" style={{ color: "var(--color-text)" }}>
                            {row.data ? `${row.data.city} ${row.data.tier} - ${row.data.label}${row.data.distance ? ` (${row.data.distance})` : ""}` : "—"}
                          </td>
                          <td className="py-1 pr-2" style={{ color: "var(--color-text-muted)" }}>
                            {row.errors.length > 0 ? row.errors.join("; ") : row.status === "update" ? "Akan memperbarui data existing" : "Siap import"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {addHotelOpen && (
          <form
            onSubmit={submitAddHotel}
            className="rounded-lg border p-4 mb-3 flex flex-col gap-3"
            style={{ borderColor: "var(--color-gold)", background: "rgba(201,168,76,0.05)" }}
          >
            <div className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>
              Tambah Harga Hotel Baru
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Kota</span>
                <select
                  value={addHotelForm.city}
                  onChange={(e) => setAddHotelForm((f) => ({ ...f, city: e.target.value as "MAKKAH" | "MADINAH" }))}
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Kategori</span>
                <select
                  value={addHotelForm.tier}
                  onChange={(e) => setAddHotelForm((f) => ({ ...f, tier: e.target.value as AddHotelForm["tier"] }))}
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  {HOTEL_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Label</span>
                <input
                  type="text"
                  value={addHotelForm.label}
                  onChange={(e) => setAddHotelForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="cth. Safwa Tower 3"
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Sublabel</span>
                <input
                  type="text"
                  value={addHotelForm.sublabel}
                  onChange={(e) => setAddHotelForm((f) => ({ ...f, sublabel: e.target.value }))}
                  placeholder="cth. 3★, dekat Haram"
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Jarak</span>
                <input
                  type="text"
                  value={addHotelForm.distance}
                  onChange={(e) => setAddHotelForm((f) => ({ ...f, distance: e.target.value }))}
                  placeholder="cth. 250m jalan kaki"
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>SAR/malam (dasar)</span>
                <input
                  type="number"
                  min={1}
                  value={addHotelForm.sarPerNight}
                  onChange={(e) => setAddHotelForm((f) => ({ ...f, sarPerNight: e.target.value }))}
                  placeholder="cth. 1300"
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </label>
            </div>
            {addHotelError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>{addHotelError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addHotelLoading}
                className="text-sm px-4 py-1.5 rounded border font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
              >
                {addHotelLoading ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        )}
        <div className="rounded-lg border overflow-hidden" style={TABLE_STYLE}>
          <table className="w-full">
            <thead style={{ background: "rgba(0,0,0,0.2)" }}>
              <tr>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Kota</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Kategori</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Nama</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Jarak</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>SAR/Malam (Dasar)</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Harga Bulanan</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => {
                const isExpanded = expandedHotels.has(h.id)
                return (
                  <Fragment key={h.id}>
                    <tr className="border-t" style={{ borderColor: "var(--color-border)" }}>
                      <td className={TD} style={{ color: "var(--color-text)" }}>{h.city}</td>
                      <td className={TD} style={{ color: "var(--color-text)" }}>{h.tier}</td>
                      <td className={TD} style={{ color: "var(--color-text)" }}>{h.label}</td>
                      <td className={TD}>
                        <InlineEditCell
                          value={h.distance ?? ""}
                          type="text"
                          formatter={(v) => String(v).trim() || "-"}
                          onSave={async (newVal) => {
                            const { hotel } = await patch("hotel", {
                              hotelId: h.id,
                              city: h.city,
                              tier: h.tier,
                              sarPerNight: h.sarPerNight,
                              distance: String(newVal),
                            })
                            setHotels((prev) => prev.map((x) => x.id === h.id ? { ...hotel, monthlyPrices: h.monthlyPrices } : x))
                          }}
                        />
                      </td>
                      <td className={TD}>
                        <InlineEditCell
                          value={h.sarPerNight}
                          type="number"
                          formatter={(v) => `SAR ${v}`}
                          onSave={async (newVal) => {
                            const { hotel } = await patch("hotel", { hotelId: h.id, city: h.city, tier: h.tier, sarPerNight: newVal })
                            setHotels((prev) => prev.map((x) => x.id === h.id ? { ...hotel, monthlyPrices: h.monthlyPrices } : x))
                          }}
                        />
                      </td>
                      <td className={TD}>
                        <button
                          onClick={() => toggleMonthly(h.id)}
                          className="text-xs px-2 py-1 rounded border transition-colors hover:border-[var(--color-gold)]"
                          style={{ borderColor: "var(--color-border)", color: isExpanded ? "var(--color-gold)" : "var(--color-text-muted)" }}
                        >
                          {isExpanded ? "▲ Tutup" : "▼ Bulanan"}
                        </button>
                      </td>
                      <td className={TD} style={{ color: "var(--color-text-muted)" }}>{formatDate(h.updatedAt)}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${h.id}-monthly`} className="border-t" style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.15)" }}>
                        <td colSpan={7} className="px-3 py-3">
                          <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
                            Harga per Bulan — {h.city} {h.tier}
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {h.monthlyPrices.map((mp) => (
                              <div key={mp.month} className="flex flex-col gap-1">
                                <span className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                                  {MONTH_SHORT[mp.month - 1]}
                                </span>
                                <InlineEditCell
                                  value={mp.sarPerNight}
                                  type="number"
                                  formatter={(v) => `SAR ${v}`}
                                  onSave={async (newVal) => {
                                    const { monthlyPrice } = await patch("monthly-hotel", {
                                      hotelId: h.id,
                                      month: mp.month,
                                      sarPerNight: newVal,
                                    })
                                    updateMonthlyPrice(h.id, mp.month, monthlyPrice.sarPerNight)
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Airline Prices */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}>
            Harga Maskapai (IDR/orang)
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAirlineImportOpen((v) => !v); setAirlineImportError(""); setAirlineImportPreview(null) }}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{
                borderColor: airlineImportOpen ? "var(--color-gold)" : "var(--color-border)",
                color: airlineImportOpen ? "var(--color-gold)" : "var(--color-text-muted)",
              }}
            >
              {airlineImportOpen ? "Tutup Import" : "Import Maskapai CSV"}
            </button>
            <button
              onClick={() => { setAddAirlineOpen((v) => !v); setAddAirlineError("") }}
              className="text-xs px-3 py-1.5 rounded border transition-colors"
              style={{
                borderColor: addAirlineOpen ? "var(--color-gold)" : "var(--color-border)",
                color: addAirlineOpen ? "var(--color-gold)" : "var(--color-text-muted)",
              }}
            >
              {addAirlineOpen ? "✕ Batal" : "+ Tambah Maskapai"}
            </button>
          </div>
        </div>

        {airlineImportOpen && (
          <div
            className="rounded-lg border p-4 mb-3 flex flex-col gap-3"
            style={{ borderColor: "var(--color-border)", background: "rgba(201,168,76,0.04)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>
                  Import Harga Maskapai CSV
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Satu baris per opsi maskapai. Kolom bulanan kosong akan mengikuti harga dasar.
                </p>
              </div>
              <a
                href="/api/admin/pricing/airline-import/template"
                className="text-xs px-3 py-1.5 rounded border inline-flex justify-center"
                style={{ borderColor: "var(--color-border)", color: "var(--color-gold)" }}
              >
                Download Template
              </a>
            </div>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void handleAirlineImportFile(e.target.files?.[0] ?? null)}
              className="text-sm"
              style={{ color: "var(--color-text-muted)" }}
            />

            <textarea
              value={airlineImportCsv}
              onChange={(e) => { setAirlineImportCsv(e.target.value); setAirlineImportPreview(null); setAirlineImportError("") }}
              placeholder="Tempel isi CSV maskapai di sini atau pilih file CSV..."
              className="rounded border px-3 py-2 text-xs font-mono min-h-28 bg-transparent"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            />

            {airlineImportError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>{airlineImportError}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={previewAirlineImport}
                disabled={airlineImportLoading || airlineImportConfirming}
                className="text-sm px-4 py-1.5 rounded border font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
              >
                {airlineImportLoading ? "Memeriksa..." : "Preview"}
              </button>
              <button
                type="button"
                onClick={confirmAirlineImport}
                disabled={!canConfirmAirlineImport || airlineImportConfirming || airlineImportLoading}
                className="text-sm px-4 py-1.5 rounded border font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: canConfirmAirlineImport ? "var(--color-gold)" : "var(--color-border)", color: canConfirmAirlineImport ? "var(--color-gold)" : "var(--color-text-muted)" }}
              >
                {airlineImportConfirming ? "Mengimpor..." : "Konfirmasi Import"}
              </button>
            </div>

            {airlineImportPreview && (
              <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.16)" }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {([
                    ["Baru", airlineImportPreview.summary.create],
                    ["Update", airlineImportPreview.summary.update],
                    ["Invalid", airlineImportPreview.summary.invalid],
                    ["Konflik", airlineImportPreview.summary.conflict],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="rounded border px-2 py-2" style={{ borderColor: "var(--color-border)" }}>
                      <div style={{ color: "var(--color-text-muted)" }}>{label}</div>
                      <div className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div className="max-h-48 overflow-auto text-xs">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr style={{ color: "var(--color-text-muted)" }}>
                        <th className="text-left py-1 pr-2">Baris</th>
                        <th className="text-left py-1 pr-2">Status</th>
                        <th className="text-left py-1 pr-2">Maskapai</th>
                        <th className="text-left py-1 pr-2">Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {airlineImportPreview.rows.map((row) => (
                        <tr key={row.rowNumber} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                          <td className="py-1 pr-2" style={{ color: "var(--color-text-muted)" }}>{row.rowNumber}</td>
                          <td className="py-1 pr-2 uppercase" style={{ color: row.status === "invalid" || row.status === "conflict" ? "#ef4444" : "var(--color-gold)" }}>
                            {row.status}
                          </td>
                          <td className="py-1 pr-2" style={{ color: "var(--color-text)" }}>
                            {row.data ? `${row.data.tier} - ${row.data.label}` : "—"}
                          </td>
                          <td className="py-1 pr-2" style={{ color: "var(--color-text-muted)" }}>
                            {row.errors.length > 0 ? row.errors.join("; ") : row.status === "update" ? "Akan memperbarui data existing" : "Siap import"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {addAirlineOpen && (
          <form
            onSubmit={submitAddAirline}
            className="rounded-lg border p-4 mb-3 flex flex-col gap-3"
            style={{ borderColor: "var(--color-gold)", background: "rgba(201,168,76,0.05)" }}
          >
            <div className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>
              Tambah Opsi Maskapai Baru
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Tier</span>
                <select
                  value={addAirlineForm.tier}
                  onChange={(e) => setAddAirlineForm((f) => ({ ...f, tier: e.target.value as AddAirlineForm["tier"] }))}
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  {AIRLINE_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>IDR/orang (dasar)</span>
                <input
                  type="number"
                  min={1}
                  value={addAirlineForm.idr}
                  onChange={(e) => setAddAirlineForm((f) => ({ ...f, idr: e.target.value }))}
                  placeholder="cth. 14500000"
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Label</span>
                <input
                  type="text"
                  value={addAirlineForm.label}
                  onChange={(e) => setAddAirlineForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="cth. Batik Air"
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Sublabel</span>
                <input
                  type="text"
                  value={addAirlineForm.sublabel}
                  onChange={(e) => setAddAirlineForm((f) => ({ ...f, sublabel: e.target.value }))}
                  placeholder="cth. Transit, harga reguler"
                  className="rounded border px-2 py-1.5 text-sm bg-transparent"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                />
              </label>
              <label className="col-span-2 flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <input
                  type="checkbox"
                  checked={addAirlineForm.isDefault}
                  onChange={(e) => setAddAirlineForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="accent-[var(--color-gold)]"
                />
                Jadikan default untuk tier ini
              </label>
            </div>
            {addAirlineError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>{addAirlineError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addAirlineLoading}
                className="text-sm px-4 py-1.5 rounded border font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
              >
                {addAirlineLoading ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-lg border overflow-hidden" style={TABLE_STYLE}>
          <table className="w-full">
            <thead style={{ background: "rgba(0,0,0,0.2)" }}>
              <tr>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Maskapai</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Label</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Default</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>IDR/orang (Dasar)</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Harga Bulanan</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {airlines.map((a) => {
                const isExpanded = expandedAirlines.has(a.id)
                return (
                  <Fragment key={a.id}>
                    <tr className="border-t" style={{ borderColor: "var(--color-border)" }}>
                      <td className={TD} style={{ color: "var(--color-text)" }}>{a.tier}</td>
                      <td className={TD} style={{ color: "var(--color-text)" }}>
                        <div>{a.label}</div>
                        {a.sublabel && (
                          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{a.sublabel}</div>
                        )}
                      </td>
                      <td className={TD}>
                        <input
                          type="radio"
                          name={`default-airline-${a.tier}`}
                          checked={a.isDefault}
                          onChange={async () => {
                            if (a.isDefault) return
                            const { airline } = await patch("airline", { airlineId: a.id, tier: a.tier, isDefault: true })
                            setAirlines((prev) => prev.map((x) => x.tier === a.tier ? { ...x, isDefault: x.id === a.id, ...(x.id === a.id ? airline : {}) } : x))
                          }}
                          className="accent-[var(--color-gold)]"
                        />
                      </td>
                      <td className={TD}>
                        <InlineEditCell
                          value={a.idr}
                          type="number"
                          formatter={(v) => `Rp ${Number(v).toLocaleString("id-ID")}`}
                          onSave={async (newVal) => {
                            const { airline } = await patch("airline", { airlineId: a.id, tier: a.tier, idr: newVal })
                            setAirlines((prev) => prev.map((x) => x.id === a.id ? { ...airline, monthlyPrices: a.monthlyPrices } : x))
                          }}
                        />
                      </td>
                      <td className={TD}>
                        <button
                          onClick={() => toggleAirlineMonthly(a.id)}
                          className="text-xs px-2 py-1 rounded border transition-colors hover:border-[var(--color-gold)]"
                          style={{ borderColor: "var(--color-border)", color: isExpanded ? "var(--color-gold)" : "var(--color-text-muted)" }}
                        >
                          {isExpanded ? "▲ Tutup" : "▼ Bulanan"}
                        </button>
                      </td>
                      <td className={TD} style={{ color: "var(--color-text-muted)" }}>{formatDate(a.updatedAt)}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${a.id}-monthly`} className="border-t" style={{ borderColor: "var(--color-border)", background: "rgba(0,0,0,0.15)" }}>
                        <td colSpan={6} className="px-3 py-3">
                          <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
                            Harga per Bulan — {a.tier} {a.label}
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {a.monthlyPrices.map((mp) => (
                              <div key={mp.month} className="flex flex-col gap-1">
                                <span className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
                                  {MONTH_SHORT[mp.month - 1]}
                                </span>
                                <InlineEditCell
                                  value={mp.idr}
                                  type="number"
                                  formatter={(v) => `Rp ${Number(v).toLocaleString("id-ID")}`}
                                  onSave={async (newVal) => {
                                    const { monthlyPrice } = await patch("monthly-airline", {
                                      airlineId: a.id,
                                      month: mp.month,
                                      idr: newVal,
                                    })
                                    updateAirlineMonthlyPrice(a.id, mp.month, monthlyPrice.idr)
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Service Fees */}
      <section>
        <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}>
          Biaya Layanan
        </h2>
        <div className="rounded-lg border overflow-hidden" style={TABLE_STYLE}>
          <table className="w-full">
            <thead style={{ background: "rgba(0,0,0,0.2)" }}>
              <tr>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Layanan</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Mata Uang</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Jumlah</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Aktif</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Dibagi Grup</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <td className={TD} style={{ color: "var(--color-text)" }}>{s.label}</td>
                  <td className={TD} style={{ color: "var(--color-text)" }}>{s.currency}</td>
                  <td className={TD}>
                    <InlineEditCell
                      value={s.amount}
                      type="number"
                      onSave={async (newVal) => {
                        const { service } = await patch("service", { key: s.key, amount: newVal })
                        setServices((prev) => prev.map((x) => x.id === s.id ? service : x))
                      }}
                    />
                  </td>
                  <td className={TD}>
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={async (e) => {
                        try {
                          const { service } = await patch("service", { key: s.key, enabled: e.target.checked })
                          setServices((prev) => prev.map((x) => x.id === s.id ? service : x))
                        } catch {
                          // revert is handled by not updating state
                        }
                      }}
                      className="accent-[var(--color-gold)]"
                    />
                  </td>
                  <td className={TD}>
                    <input
                      type="checkbox"
                      checked={s.divideByPax}
                      onChange={async (e) => {
                        try {
                          const { service } = await patch("service", { key: s.key, divideByPax: e.target.checked })
                          setServices((prev) => prev.map((x) => x.id === s.id ? service : x))
                        } catch {
                          // revert is handled by not updating state
                        }
                      }}
                      className="accent-[var(--color-gold)]"
                    />
                  </td>
                  <td className={TD} style={{ color: "var(--color-text-muted)" }}>{formatDate(s.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
