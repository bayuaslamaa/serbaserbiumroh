"use client"

import { useState } from "react"
import type {
  ExchangeRate,
  HotelPrice,
  HotelMonthlyPrice,
  AirlinePrice,
  ServiceFee,
} from "@/lib/db/schema"
import { InlineEditCell } from "./InlineEditCell"

type HotelWithMonthly = HotelPrice & { monthlyPrices: HotelMonthlyPrice[] }

interface PricingTableProps {
  rates: ExchangeRate[]
  hotels: HotelWithMonthly[]
  airlines: AirlinePrice[]
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

type AddHotelForm = {
  city: "MAKKAH" | "MADINAH"
  tier: "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
  label: string
  sublabel: string
  sarPerNight: string
}

export function PricingTable({ rates: initialRates, hotels: initialHotels, airlines: initialAirlines, services: initialServices }: PricingTableProps) {
  const [rates, setRates] = useState(initialRates)
  const [hotels, setHotels] = useState(initialHotels)
  const [airlines, setAirlines] = useState(initialAirlines)
  const [services, setServices] = useState(initialServices)
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [addHotelOpen, setAddHotelOpen] = useState(false)
  const [addHotelForm, setAddHotelForm] = useState<AddHotelForm>({
    city: "MAKKAH",
    tier: "STANDARD",
    label: "",
    sublabel: "",
    sarPerNight: "",
  })
  const [addHotelError, setAddHotelError] = useState("")
  const [addHotelLoading, setAddHotelLoading] = useState(false)

  function toggleMonthly(hotelId: string) {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      next.has(hotelId) ? next.delete(hotelId) : next.add(hotelId)
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
      setAddHotelForm({ city: "MAKKAH", tier: "STANDARD", label: "", sublabel: "", sarPerNight: "" })
    } catch (err: unknown) {
      setAddHotelError(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setAddHotelLoading(false)
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
              <label className="flex flex-col gap-1 col-span-2">
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
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>SAR/Malam (Dasar)</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Harga Bulanan</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => {
                const isExpanded = expandedHotels.has(h.id)
                return (
                  <>
                    <tr key={h.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                      <td className={TD} style={{ color: "var(--color-text)" }}>{h.city}</td>
                      <td className={TD} style={{ color: "var(--color-text)" }}>{h.tier}</td>
                      <td className={TD} style={{ color: "var(--color-text)" }}>{h.label}</td>
                      <td className={TD}>
                        <InlineEditCell
                          value={h.sarPerNight}
                          type="number"
                          formatter={(v) => `SAR ${v}`}
                          onSave={async (newVal) => {
                            const { hotel } = await patch("hotel", { city: h.city, tier: h.tier, sarPerNight: newVal })
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
                        <td colSpan={6} className="px-3 py-3">
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
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Airline Prices */}
      <section>
        <h2 className="text-lg font-bold mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}>
          Harga Maskapai (IDR/orang)
        </h2>
        <div className="rounded-lg border overflow-hidden" style={TABLE_STYLE}>
          <table className="w-full">
            <thead style={{ background: "rgba(0,0,0,0.2)" }}>
              <tr>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Maskapai</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Label</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>IDR/orang</th>
                <th className={TH} style={{ color: "var(--color-text-muted)" }}>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {airlines.map((a) => (
                <tr key={a.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <td className={TD} style={{ color: "var(--color-text)" }}>{a.tier}</td>
                  <td className={TD} style={{ color: "var(--color-text)" }}>{a.label}</td>
                  <td className={TD}>
                    <InlineEditCell
                      value={a.idr}
                      type="number"
                      formatter={(v) => `Rp ${Number(v).toLocaleString("id-ID")}`}
                      onSave={async (newVal) => {
                        const { airline } = await patch("airline", { tier: a.tier, idr: newVal })
                        setAirlines((prev) => prev.map((x) => x.id === a.id ? airline : x))
                      }}
                    />
                  </td>
                  <td className={TD} style={{ color: "var(--color-text-muted)" }}>{formatDate(a.updatedAt)}</td>
                </tr>
              ))}
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
