import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  exchangeRates,
  hotelPrices,
  airlinePrices,
  serviceFees,
  hotelMonthlyPrices,
  airlineMonthlyPrices,
} from "@/lib/db/schema"
import { PricingTable } from "@/components/admin/PricingTable"
import { asc } from "drizzle-orm"

export const metadata = { title: "Admin — Kelola Harga" }

export default async function AdminPricingPage() {
  await requireAdmin()

  const [rates, hotelsRaw, airlinesRaw, services, monthlyPrices, airlineMonthlyRows] = await Promise.all([
    db.select().from(exchangeRates),
    db.select().from(hotelPrices),
    db.select().from(airlinePrices),
    db.select().from(serviceFees),
    db.select().from(hotelMonthlyPrices).orderBy(asc(hotelMonthlyPrices.month)),
    db.select().from(airlineMonthlyPrices).orderBy(asc(airlineMonthlyPrices.month)),
  ])

  const hotels = hotelsRaw.map((h) => ({
    ...h,
    monthlyPrices: monthlyPrices
      .filter((mp) => mp.hotelPriceId === h.id)
      .sort((a, b) => a.month - b.month),
  }))

  const airlines = airlinesRaw.map((a) => ({
    ...a,
    monthlyPrices: airlineMonthlyRows
      .filter((mp) => mp.airlinePriceId === a.id)
      .sort((a, b) => a.month - b.month),
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Kelola Harga
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Klik sel untuk mengedit. Perubahan disimpan otomatis.
        </p>
      </div>
      <PricingTable rates={rates} hotels={hotels} airlines={airlines} services={services} />
    </div>
  )
}
