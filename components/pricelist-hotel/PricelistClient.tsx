"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight, Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROOM_TYPES } from "@/lib/estimate/room-types"
// pricelist-types, never pricelist: the latter value-imports `db`, and a
// "use client" module that reaches it pulls pg into the browser bundle and
// breaks the build on `fs`/`net`/`dns`. See the docblock on pricelist-types.ts.
import {
  CITY_ORDER,
  SOURCE_LABEL_NOT_RECORDED,
  TIER_ORDER,
  type PricelistHotel,
} from "@/lib/hotels/pricelist-types"
import { MONTH_NAMES_FULL, formatImportDate, formatSar } from "@/lib/hotels/pricing"
import type { RoomType } from "@/types"

/**
 * The catalogue price list.
 *
 * Every figure rendered here comes verbatim from `real_hotel_prices` via
 * composePricelist (R3). The layout borrows from
 * components/hotel-nusuk/HotelPriceList.tsx and components/admin/PricingTable.tsx,
 * but NOT their price fields: both of those render estimate-derived money
 * (buildMonthlyPrices, hotel_prices.sarPerNight, IDR conversion), and none of
 * it may appear on this page.
 */
interface PricelistClientProps {
  hotels: PricelistHotel[]
}

// The composed sort order doubles as the filter's option order: CITY_ORDER and
// TIER_ORDER are the same lists composePricelist sorts by, so a tier added in
// one place cannot go missing in the other.
const CITIES = CITY_ORDER
const TIERS = TIER_ORDER

const ALL = "Semua"

const TABLE_STYLE = {
  borderColor: "var(--color-border)",
  background: "var(--color-surface)",
}

const TH = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
const TD = "px-3 py-2 text-sm whitespace-nowrap"

/**
 * Plain-language gloss per source label (KTD5).
 *
 * The rate itself is always printed with its label verbatim -- verbatim cannot
 * be wrong about the data. But two labels differing by a parenthetical do not
 * explain themselves, so the legend does it once at page level. `sourceLabel`
 * is chosen per import batch, not per row, so this set stays small; anything
 * not listed falls back to DEFAULT_GLOSS rather than being hidden.
 */
const SOURCE_LABEL_GLOSSARY: Record<string, string> = {
  "Katalog 1448H (AZKA + Maysan/MIG)":
    "Tarif kamar per malam yang dikutip langsung dari katalog supplier 1448H.",
  "Katalog 1448H (forecast per-bed)":
    "Turunan per-bed dari katalog yang sama, disusun untuk tipe kamar selain quad. Perkiraan, bukan kutipan supplier.",
  [SOURCE_LABEL_NOT_RECORDED]:
    "Baris ini diimpor sebelum kolom sumber ada, jadi asal angkanya tidak tercatat.",
}

const DEFAULT_GLOSS =
  "Label batch impor, ditampilkan apa adanya. Tanyakan admin bila maksudnya belum jelas."

/**
 * The room types this hotel actually has a row for, widest occupancy first.
 *
 * Per-hotel rather than a fixed column set (KTD4): most hotels are QUAD-only
 * until an operator import lands, and a fixed set would give them three columns
 * of nothing -- which reads as missing data rather than as data that was never
 * quoted.
 */
function roomTypesOf(hotel: PricelistHotel): RoomType[] {
  return ROOM_TYPES.filter((roomType) =>
    Object.values(hotel.rates).some((byRoomType) => byRoomType?.[roomType])
  )
}

/**
 * Union of room types across the shown hotels, for the month-comparison table.
 *
 * Never empty while there are hotels to show. Filtering to a month none of them
 * covers used to return [], which collapsed the table to Hotel/Kota/Tier: no
 * price columns at all, and therefore not one "Tarif tidak tersedia" either.
 * The `filtered.length === 0` guard cannot catch that -- the hotels ARE there,
 * it is the columns that vanished -- so R4's promise failed silently in the
 * view the feature exists for. Falling back to the types those hotels have in
 * ANY month keeps the shape and lets every cell carry the empty treatment,
 * which is the honest answer: quoted elsewhere, not quoted here.
 */
function roomTypesAcross(hotels: PricelistHotel[], month: number): RoomType[] {
  const inMonth = ROOM_TYPES.filter((roomType) =>
    hotels.some((hotel) => hotel.rates[month]?.[roomType])
  )
  if (inMonth.length > 0) return inMonth

  return ROOM_TYPES.filter((roomType) =>
    hotels.some((hotel) => roomTypesOf(hotel).includes(roomType))
  )
}

/**
 * The 1-based marker a rate carries, or null when the enclosing list holds a
 * single label and the prose beneath already names it.
 *
 * One helper rather than the same `length > 1` test written at the cell and
 * again at the numbering beneath it: they are one decision, and two copies are
 * how a superscript ends up pointing at an entry that was never numbered.
 */
function sourceMarker(labels: string[], sourceLabel: string): number | null {
  if (labels.length <= 1) return null

  const index = labels.indexOf(sourceLabel)
  return index === -1 ? null : index + 1
}

/**
 * A month/room-type slot the catalogue never quoted.
 *
 * A bare <td> announces as nothing and reads as a render fault, so the miss is
 * spelled out: a muted glyph for sighted readers, sr-only wording for everyone
 * else (R4). Never a zero, never a dash -- both read as a rate.
 */
function EmptyRateCell() {
  return (
    <td className={`${TD} text-right`}>
      <span aria-hidden="true" style={{ color: "var(--color-text-muted)" }}>
        ·
      </span>
      <span className="sr-only">Tarif tidak tersedia</span>
    </td>
  )
}

/**
 * One catalogue rate, attributed to its own source label.
 *
 * The attribution is per cell, not per table: one hotel can carry a quad rate
 * from the catalogue and a double rate from the per-bed forecast (AE4), and a
 * single footer line would merge the two into something the reader cannot pull
 * apart. The visible marker only appears when the hotel has more than one label
 * -- otherwise the footer already says it once.
 */
function RateCell({
  sarPerNight,
  sourceLabel,
  marker,
}: {
  sarPerNight: number
  sourceLabel: string
  marker: number | null
}) {
  return (
    <td className={`${TD} text-right tabular-nums`}>
      {formatSar(sarPerNight)}
      {marker !== null && (
        <sup aria-hidden="true" className="ml-0.5" style={{ color: "var(--color-text-muted)" }}>
          {marker}
        </sup>
      )}
      <span className="sr-only"> (sumber: {sourceLabel})</span>
    </td>
  )
}

function HotelMeta({ hotel }: { hotel: PricelistHotel }) {
  return (
    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
      {hotel.city} · {hotel.tier}
      {hotel.sublabel ? ` · ${hotel.sublabel}` : ""}
      {hotel.distance ? ` · ${hotel.distance}` : ""}
    </p>
  )
}

function HotelName({ hotel }: { hotel: PricelistHotel }) {
  // Rows the slug backfill has not reached render as plain text, the same way
  // components/hotel-nusuk/HotelPriceList.tsx handles them.
  if (!hotel.slug) return <>{hotel.label}</>

  return (
    <Link href={`/hotel-nusuk/${hotel.slug}`} className="hover:underline">
      {hotel.label}
    </Link>
  )
}

/** The distinct labels under a hotel's table, numbered to match its cell markers. */
function SourceFooter({ hotel }: { hotel: PricelistHotel }) {
  return (
    <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
      Sumber:{" "}
      {hotel.sourceLabels
        .map((label) => {
          const marker = sourceMarker(hotel.sourceLabels, label)
          return marker === null ? label : `${marker}. ${label}`
        })
        .join(" · ")}
      {" · "}Diperbarui {formatImportDate(hotel.updatedAt)}
    </p>
  )
}

/** A hotel's twelve months by its own room types, shown when the section is expanded. */
function MonthTable({ hotel }: { hotel: PricelistHotel }) {
  const roomTypes = roomTypesOf(hotel)

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[320px] border-collapse rounded-md border"
        style={TABLE_STYLE}
      >
        <caption className="sr-only">
          Tarif katalog {hotel.label} per malam untuk setiap bulan, dalam SAR
        </caption>
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
            <th scope="col" className={TH}>
              Bulan
            </th>
            {roomTypes.map((roomType) => (
              <th key={roomType} scope="col" className={`${TH} text-right`}>
                {roomType}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* All twelve, always: a constant table shape is what lets a gap read
              as a gap rather than as a table that stopped early (R4/AE3). */}
          {MONTH_NAMES_FULL.map((monthName, index) => {
            const month = index + 1

            return (
              <tr key={month} className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th scope="row" className={`${TD} font-normal`}>
                  {monthName}
                </th>
                {roomTypes.map((roomType) => {
                  const rate = hotel.rates[month]?.[roomType]
                  if (!rate) return <EmptyRateCell key={roomType} />

                  return (
                    <RateCell
                      key={roomType}
                      sarPerNight={rate.sarPerNight}
                      sourceLabel={rate.sourceLabel}
                      // This hotel's own labels, matching the footer directly
                      // beneath the table.
                      marker={sourceMarker(hotel.sourceLabels, rate.sourceLabel)}
                    />
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * One row per hotel for a single month (R6/AE7).
 *
 * Order is the composed order -- city, then tier, then name -- rather than
 * cheapest-first: the room types are different bases (a double is not a cheaper
 * quad), so a single price sort across mixed columns would rank hotels on
 * whichever basis happened to be present. Filtering to a city and tier and
 * reading one column down is the comparison this view exists for.
 *
 * `labels` is the page-level list, not a per-hotel one: each row here belongs
 * to a different hotel, so a per-hotel index would give the same source
 * different numbers down the column. The legend is numbered off the same list.
 */
function MonthComparisonTable({
  hotels,
  month,
  labels,
}: {
  hotels: PricelistHotel[]
  month: number
  labels: string[]
}) {
  const roomTypes = roomTypesAcross(hotels, month)
  const monthName = MONTH_NAMES_FULL[month - 1]

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[520px] border-collapse rounded-md border"
        style={TABLE_STYLE}
      >
        <caption className="sr-only">
          Tarif katalog per malam bulan {monthName} untuk setiap hotel, dalam SAR
        </caption>
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
            <th scope="col" className={TH}>
              Hotel
            </th>
            <th scope="col" className={TH}>
              Kota
            </th>
            <th scope="col" className={TH}>
              Tier
            </th>
            {roomTypes.map((roomType) => (
              <th key={roomType} scope="col" className={`${TH} text-right`}>
                {roomType}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hotels.map((hotel) => (
            <tr
              key={hotel.hotelPriceId}
              className="border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <th scope="row" className={`${TD} font-normal`}>
                <HotelName hotel={hotel} />
              </th>
              <td className={TD} style={{ color: "var(--color-text-muted)" }}>
                {hotel.city}
              </td>
              <td className={TD} style={{ color: "var(--color-text-muted)" }}>
                {hotel.tier}
              </td>
              {roomTypes.map((roomType) => {
                const rate = hotel.rates[month]?.[roomType]
                if (!rate) return <EmptyRateCell key={roomType} />

                return (
                  <RateCell
                    key={roomType}
                    sarPerNight={rate.sarPerNight}
                    sourceLabel={rate.sourceLabel}
                    // Hardcoding null here left a sighted reader no way to tell
                    // a catalogue rate from a forecast one, in the one view
                    // built for putting them side by side.
                    marker={sourceMarker(labels, rate.sourceLabel)}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HotelSection({ hotel }: { hotel: PricelistHotel }) {
  const [expanded, setExpanded] = useState(false)
  const headingId = useId()
  const panelId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--color-border)", backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id={headingId}
            className="text-sm font-bold"
            style={{ color: "var(--color-gold)" }}
          >
            <HotelName hotel={hotel} />
          </h3>
          <HotelMeta hotel={hotel} />
        </div>

        {/* A separate control rather than a button wrapping the heading: the
            heading may contain a link, and a link inside a button is neither
            valid nor operable. */}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={`Tarif bulanan ${hotel.label}`}
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          12 bulan
        </button>
      </div>

      {expanded && (
        <div id={panelId} className="mt-3">
          <MonthTable hotel={hotel} />
          <SourceFooter hotel={hotel} />
        </div>
      )}
    </section>
  )
}

/** The page-level gloss of every label present in the data (R5/KTD5). */
function SourceLegend({ labels }: { labels: string[] }) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
    >
      <h2 id={headingId} className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>
        Keterangan sumber
      </h2>
      <dl className="mt-2 space-y-1.5 text-xs">
        {labels.map((label) => (
          <div key={label}>
            {/* Numbered by the same helper the comparison table's superscripts
                use, so a "2" in a rate cell resolves to an entry a reader can
                actually find. */}
            <dt className="font-medium" style={{ color: "var(--color-text)" }}>
              {[sourceMarker(labels, label), label].filter(Boolean).join(". ")}
            </dt>
            <dd style={{ color: "var(--color-text-muted)" }}>
              {SOURCE_LABEL_GLOSSARY[label] ?? DEFAULT_GLOSS}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function PricelistClient({ hotels }: PricelistClientProps) {
  const [city, setCity] = useState<string>(ALL)
  const [tier, setTier] = useState<string>(ALL)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [month, setMonth] = useState<string>(ALL)

  const filtered = hotels.filter((hotel) => {
    if (city !== ALL && hotel.city !== city) return false
    if (tier !== ALL && hotel.tier !== tier) return false
    if (
      searchQuery.trim() !== "" &&
      !hotel.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
    ) {
      return false
    }
    return true
  })

  // Every label in the data, not just the filtered slice: the legend is a
  // glossary of the page's vocabulary, and having entries appear and disappear
  // as filters move would make it read like a result set.
  const legendLabels = useMemo(() => {
    const labels = new Set<string>()
    for (const hotel of hotels) for (const label of hotel.sourceLabels) labels.add(label)
    return [...labels].sort((a, b) => a.localeCompare(b, "id-ID"))
  }, [hotels])

  const selectedMonth = month === ALL ? null : Number(month)

  return (
    <div className="space-y-6">
      <div
        className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}
      >
        <div className="relative flex-grow">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <Input
            placeholder="Cari nama hotel..."
            aria-label="Cari nama hotel"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-36" aria-label="Kota">
              <SelectValue placeholder="Kota" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Kota</SelectItem>
              {CITIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="w-36" aria-label="Tier">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Tier</SelectItem>
              {TIERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40" aria-label="Bulan">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua Bulan</SelectItem>
              {MONTH_NAMES_FULL.map((monthName, index) => (
                <SelectItem key={monthName} value={String(index + 1)}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className="flex flex-wrap justify-between gap-2 px-1 text-xs"
        style={{ color: "var(--color-text-muted)" }}
      >
        <span>
          Menampilkan {filtered.length} dari {hotels.length} hotel
        </span>
        <span>
          {selectedMonth
            ? `Tarif katalog bulan ${MONTH_NAMES_FULL[selectedMonth - 1]}, satu baris per hotel`
            : "Semua tarif dalam SAR, apa adanya dari katalog"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-lg border py-12 text-center text-sm"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text-muted)",
          }}
        >
          Tidak ada hotel yang cocok dengan pencarian dan filter Anda.
        </div>
      ) : selectedMonth ? (
        <MonthComparisonTable hotels={filtered} month={selectedMonth} labels={legendLabels} />
      ) : (
        <div className="space-y-3">
          {filtered.map((hotel) => (
            <HotelSection key={hotel.hotelPriceId} hotel={hotel} />
          ))}
        </div>
      )}

      {legendLabels.length > 0 && <SourceLegend labels={legendLabels} />}
    </div>
  )
}
