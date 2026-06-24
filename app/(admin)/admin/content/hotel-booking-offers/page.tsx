import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { hotelBookingOffers } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { HotelBookingOfferImportPanel } from "@/components/admin/hotel-booking-offers/HotelBookingOfferImportPanel"
import { HotelBookingOfferTableActions } from "./HotelBookingOfferTableActions"

export const metadata = { title: "Admin — Offer Booking Hotel" }

const CITY_LABELS: Record<string, string> = {
  MAKKAH: "Makkah",
  MADINAH: "Madinah",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktif",
  UNAVAILABLE: "Tidak tersedia",
  INACTIVE: "Arsip",
}

export default async function AdminHotelBookingOffersPage() {
  await requireAdmin()

  const offers = await db
    .select()
    .from(hotelBookingOffers)
    .orderBy(desc(hotelBookingOffers.updatedAt))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            Offer Booking Hotel
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            {offers.length} offer tersimpan untuk booking manual via WhatsApp.
          </p>
        </div>
        <Link
          href="/admin/content/hotel-booking-offers/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--color-gold)", color: "#1a1206" }}
        >
          + Tambah Offer
        </Link>
      </div>

      <HotelBookingOfferImportPanel />

      <div
        className="rounded-lg border overflow-x-auto"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <table className="w-full min-w-[980px]">
          <thead style={{ background: "rgba(0,0,0,0.2)" }}>
            <tr>
              {["Hotel", "Kota", "Periode", "Harga", "Status", "Update", "Aksi"].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm italic"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Belum ada offer booking. Tambahkan manual atau import CSV.
                </td>
              </tr>
            )}
            {offers.map((offer) => (
              <tr key={offer.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                    {offer.hotelName}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                    {offer.offerLabel || offer.roomBasis}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {CITY_LABELS[offer.city] ?? offer.city}
                  <span className="block text-xs">{offer.tier}</span>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {offer.periodLabel || `${formatDate(offer.periodStart)} - ${formatDate(offer.periodEnd)}`}
                </td>
                <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {offer.currency} {offer.priceAmount.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={offer.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                    {STATUS_LABELS[offer.status] ?? offer.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {formatDateTime(offer.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <HotelBookingOfferTableActions id={offer.id} status={offer.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(value)
}
