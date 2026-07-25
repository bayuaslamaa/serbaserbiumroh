"use client"

import { useState } from "react"
import type { City, EstimateAirline, EstimateParams, HotelOptionConfig, PricingConfig, RoomType } from "@/types"
import { DEFAULT_PARAMS } from "@/types"
import { cn } from "@/lib/utils"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { MIN_TRIP_DAYS, MAX_TRIP_DAYS, totalTripDays, totalTripDaysToNights } from "@/lib/estimate/nights"
import { resolveCityHotelOptions, resolveHotelSelection } from "@/lib/estimate/hotel-selection"
import { FieldTray } from "./FieldTray"
import { FieldSheet } from "./FieldSheet"
import { MonthGrid } from "./MonthGrid"
import { Stepper } from "./Stepper"
import { RadioCardGrid } from "./RadioCardGrid"
import { ServiceCheckboxGrid } from "./ServiceCheckboxGrid"
import { HotelPicker } from "./HotelPicker"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const MONTH_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

type FieldKey =
  | "days"
  | "pax"
  | "month"
  | "madinahNights"
  | "madinahHotel"
  | "makkahNights"
  | "makkahHotel"
  | "roomType"
  | "fullboard"
  | "airline"
  | "services"

const FIELD_TITLES: Record<FieldKey, string> = {
  days: "Jumlah Hari",
  pax: "Jumlah Peserta",
  month: "Bulan Keberangkatan",
  madinahNights: "Malam di Madinah",
  madinahHotel: "Hotel Madinah",
  makkahNights: "Malam di Makkah",
  makkahHotel: "Hotel Makkah",
  roomType: "Tipe Kamar",
  fullboard: "Full Board",
  airline: "Maskapai",
  services: "Layanan Tambahan",
}

interface SentenceCardProps {
  params: EstimateParams
  pricing: PricingConfig
  onChange: (patch: Partial<EstimateParams>) => void
  onStartOver?: () => void
}

function selectedHotelId(city: City, hotelOptions: HotelOptionConfig[], params: EstimateParams): string | undefined {
  const explicitId = city === "MAKKAH" ? params.makkahHotelId : params.madinahHotelId
  if (explicitId && hotelOptions.some((option) => option.id === explicitId)) {
    return explicitId
  }
  return hotelOptions.find((option) => option.tier === params.hotelTier)?.id ?? hotelOptions[0]?.id
}

export function SentenceCard({ params, pricing, onChange, onStartOver }: SentenceCardProps) {
  const isDesktop = useIsDesktop()
  const [openField, setOpenField] = useState<FieldKey | null>(null)

  const totalDays = totalTripDays(params)

  const madinahHotelOptions = resolveCityHotelOptions(pricing, "MADINAH")
  const makkahHotelOptions = resolveCityHotelOptions(pricing, "MAKKAH")
  const madinahSelectedId = selectedHotelId("MADINAH", madinahHotelOptions, params)
  const makkahSelectedId = selectedHotelId("MAKKAH", makkahHotelOptions, params)
  const madinahHotelLabel = madinahHotelOptions.find((h) => h.id === madinahSelectedId)?.label
  const makkahHotelLabel = makkahHotelOptions.find((h) => h.id === makkahSelectedId)?.label

  const roomOptions = (["QUAD", "TRIPLE", "DOUBLE", "SINGLE"] as const).map((rt) => {
    const rm = pricing.roomMultipliers[rt]
    return {
      value: rt,
      label: rt.charAt(0) + rt.slice(1).toLowerCase(),
      sublabel: `${rm.paxPerRoom} orang/kamar`,
      badge: `×${rm.multiplier}`,
    }
  })

  const airlineOptions = [
    { value: "NONE", label: "Tanpa penerbangan", sublabel: "Tiket diurus sendiri", badge: "Rp 0" },
    ...(["BUDGET", "STANDARD", "GARUDA", "BUSINESS"] as const).map((a) => ({
      value: a,
      label: pricing.airlines[a].label,
      badge: `Rp ${(pricing.airlines[a].idr / 1_000_000).toFixed(1)}jt`,
    })),
  ]

  const roomLabel = roomOptions.find((o) => o.value === params.roomType)?.label ?? params.roomType
  const airlineLabel = airlineOptions.find((o) => o.value === params.airline)?.label ?? params.airline
  const monthLabel = params.travelMonth ? MONTH_LABELS[params.travelMonth - 1] : undefined
  const servicesCount = params.services.length

  function handleHotelSelect(city: City, hotelId: string) {
    const patch = resolveHotelSelection(city, hotelId, pricing)
    if (patch) onChange(patch)
  }

  function handleStartOverConfirm() {
    onChange({
      ...DEFAULT_PARAMS,
      madinahHotelId: undefined,
      makkahHotelId: undefined,
      travelMonth: undefined,
    })
    setOpenField(null)
    onStartOver?.()
  }

  function renderChip(fieldKey: FieldKey, label: string, ariaLabel: string) {
    const isOpen = openField === fieldKey
    return (
      <button
        type="button"
        key={fieldKey}
        onClick={() => setOpenField(isOpen ? null : fieldKey)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-controls={`field-editor-${fieldKey}`}
        className={cn(
          "inline-flex items-center rounded px-1.5 py-0.5 border-b-2 font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]",
          isOpen ? "border-[var(--color-gold)]" : "border-transparent hover:border-[var(--color-gold-muted)]"
        )}
        style={{ color: "var(--color-gold)" }}
      >
        {label}
      </button>
    )
  }

  function fieldBody(fieldKey: FieldKey) {
    switch (fieldKey) {
      case "days":
        return (
          <Stepper
            value={totalDays}
            onChange={(v) => onChange(totalTripDaysToNights(v))}
            min={MIN_TRIP_DAYS}
            max={MAX_TRIP_DAYS}
          />
        )
      case "pax":
        return <Stepper value={params.pax} onChange={(v) => onChange({ pax: v })} min={1} max={200} />
      case "month":
        return <MonthGrid value={params.travelMonth} onChange={(month) => onChange({ travelMonth: month })} />
      case "madinahNights":
        return (
          <Stepper value={params.nightsMadinah} onChange={(v) => onChange({ nightsMadinah: v })} min={1} max={30} />
        )
      case "madinahHotel":
        return (
          <HotelPicker
            hotels={madinahHotelOptions}
            selectedId={madinahSelectedId}
            travelMonth={params.travelMonth}
            onSelect={(id) => handleHotelSelect("MADINAH", id)}
          />
        )
      case "makkahNights":
        return (
          <Stepper value={params.nightsMakkah} onChange={(v) => onChange({ nightsMakkah: v })} min={1} max={30} />
        )
      case "makkahHotel":
        return (
          <HotelPicker
            hotels={makkahHotelOptions}
            selectedId={makkahSelectedId}
            travelMonth={params.travelMonth}
            onSelect={(id) => handleHotelSelect("MAKKAH", id)}
          />
        )
      case "roomType":
        return (
          <RadioCardGrid
            options={roomOptions}
            value={params.roomType}
            onChange={(v) => onChange({ roomType: v as RoomType })}
          />
        )
      case "fullboard":
        return (
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
        )
      case "airline":
        return (
          <RadioCardGrid
            options={airlineOptions}
            value={params.airline}
            onChange={(v) => onChange({ airline: v as EstimateAirline })}
          />
        )
      case "services":
        return (
          <div className="flex flex-col gap-3">
            <ServiceCheckboxGrid
              pricing={pricing}
              value={params.services}
              onChange={(services) => onChange({ services })}
            />
            <Button type="button" onClick={() => setOpenField(null)} className="self-end">
              Selesai
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <p
        className="text-lg leading-relaxed flex flex-wrap items-center gap-x-1.5 gap-y-2"
        style={{ color: "var(--color-text)" }}
      >
        <span>Umroh</span>
        {renderChip("days", `${totalDays} hari`, `Jumlah hari: ${totalDays} hari, klik untuk ubah`)}
        <span>untuk</span>
        {renderChip("pax", `${params.pax} orang`, `Jumlah peserta: ${params.pax} orang, klik untuk ubah`)}
        <span>bulan</span>
        {renderChip(
          "month",
          monthLabel ?? "pilih bulan",
          `Bulan: ${monthLabel ?? "belum dipilih"}, klik untuk ubah`
        )}
        <span>. Madinah</span>
        {renderChip(
          "madinahNights",
          `${params.nightsMadinah} malam`,
          `Malam di Madinah: ${params.nightsMadinah} malam, klik untuk ubah`
        )}
        <span>di</span>
        {renderChip(
          "madinahHotel",
          madinahHotelLabel ?? "pilih hotel",
          `Hotel Madinah: ${madinahHotelLabel ?? "belum dipilih"}, klik untuk ubah`
        )}
        <span>, Makkah</span>
        {renderChip(
          "makkahNights",
          `${params.nightsMakkah} malam`,
          `Malam di Makkah: ${params.nightsMakkah} malam, klik untuk ubah`
        )}
        <span>di</span>
        {renderChip(
          "makkahHotel",
          makkahHotelLabel ?? "pilih hotel",
          `Hotel Makkah: ${makkahHotelLabel ?? "belum dipilih"}, klik untuk ubah`
        )}
        <span>, kamar</span>
        {renderChip("roomType", roomLabel, `Tipe kamar: ${roomLabel}, klik untuk ubah`)}
        {isDesktop && (
          <>
            <span>,</span>
            {renderChip(
              "fullboard",
              params.fullboard ? "fullboard" : "tanpa fullboard",
              `Full board: ${params.fullboard ? "ya" : "tidak"}, klik untuk ubah`
            )}
            <span>, naik</span>
            {renderChip("airline", airlineLabel, `Maskapai: ${airlineLabel}, klik untuk ubah`)}
            <span>, tambah</span>
            {renderChip(
              "services",
              servicesCount > 0 ? `${servicesCount} layanan` : "belum ada layanan",
              `Layanan tambahan: ${servicesCount > 0 ? `${servicesCount} dipilih` : "belum ada"}, klik untuk ubah`
            )}
            <span>.</span>
          </>
        )}
      </p>

      <div className="flex items-center justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="text-xs underline underline-offset-2"
              style={{ color: "var(--color-text-muted)" }}
            >
              Ceritakan ulang dari nol
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mulai cerita dari awal?</AlertDialogTitle>
              <AlertDialogDescription>
                Semua pilihan pada kalimat ini akan direset ke default. Rincian biaya manual Anda tidak akan
                berubah.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleStartOverConfirm}>Ya, mulai ulang</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {openField &&
        (isDesktop ? (
          <FieldTray key={openField} title={FIELD_TITLES[openField]} onClose={() => setOpenField(null)}>
            <div id={`field-editor-${openField}`}>{fieldBody(openField)}</div>
          </FieldTray>
        ) : (
          <FieldSheet
            key={openField}
            open
            onOpenChange={(open) => {
              if (!open) setOpenField(null)
            }}
            title={FIELD_TITLES[openField]}
            disableOutsideClose={openField === "services"}
          >
            <div id={`field-editor-${openField}`}>{fieldBody(openField)}</div>
          </FieldSheet>
        ))}
    </div>
  )
}
