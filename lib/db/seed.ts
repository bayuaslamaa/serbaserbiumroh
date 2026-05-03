import { db } from "./index"
import {
  exchangeRates,
  hotelPrices,
  airlinePrices,
  serviceFees,
  roomMultipliers,
  hotelMonthlyPrices,
} from "./schema"

async function seed() {
  console.log("Seeding database...")

  // Exchange rates (PRD §8)
  await db
    .insert(exchangeRates)
    .values([
      { currency: "SAR", rateToIdr: 4700, updatedBy: "system" },
      { currency: "USD", rateToIdr: 17300, updatedBy: "system" },
    ])
    .onConflictDoNothing()

  console.log("✓ Exchange rates seeded")

  // Hotel prices (PRD §8)
  await db
    .insert(hotelPrices)
    .values([
      // Madinah
      {
        city: "MADINAH",
        tier: "ECONOMY",
        sarPerNight: 450,
        label: "Hotel Ekonomi Madinah",
        sublabel: "2-3★, ±1km Nabawi",
      },
      {
        city: "MADINAH",
        tier: "STANDARD",
        sarPerNight: 650,
        label: "Grand Plaza Badr Maqam",
        sublabel: "4★, dekat Nabawi",
      },
      {
        city: "MADINAH",
        tier: "PELATARAN",
        sarPerNight: 2000,
        label: "Pelataran Masjid Nabawi",
        sublabel: "Di dalam pelataran",
      },
      {
        city: "MADINAH",
        tier: "PREMIUM",
        sarPerNight: 3500,
        label: "Hotel Bintang 5 Madinah",
        sublabel: "Bintang 5 pelataran",
      },
      // Makkah
      {
        city: "MAKKAH",
        tier: "ECONOMY",
        sarPerNight: 800,
        label: "Hotel Ekonomi Makkah",
        sublabel: "2-3★, jauh Haram",
      },
      {
        city: "MAKKAH",
        tier: "STANDARD",
        sarPerNight: 1300,
        label: "Safwa Tower 3",
        sublabel: "3★, dekat Haram",
      },
      {
        city: "MAKKAH",
        tier: "PELATARAN",
        sarPerNight: 3500,
        label: "Pelataran Masjidil Haram",
        sublabel: "Di dalam pelataran",
      },
      {
        city: "MAKKAH",
        tier: "PREMIUM",
        sarPerNight: 6000,
        label: "Hotel Bintang 5 Makkah",
        sublabel: "Bintang 5 pelataran",
      },
    ])
    .onConflictDoNothing()

  console.log("✓ Hotel prices seeded")

  // Airline prices (PRD §8)
  await db
    .insert(airlinePrices)
    .values([
      {
        tier: "BUDGET",
        idr: 12500000,
        label: "Lion Air, AirAsia",
        sublabel: "Transit, ~12,5jt",
      },
      {
        tier: "STANDARD",
        idr: 14500000,
        label: "Batik Air, Saudia",
        sublabel: "~14,5jt",
      },
      {
        tier: "GARUDA",
        idr: 17000000,
        label: "Garuda Indonesia",
        sublabel: "Penerbangan langsung",
      },
      {
        tier: "BUSINESS",
        idr: 25000000,
        label: "Business Class",
        sublabel: "Semua maskapai",
      },
    ])
    .onConflictDoNothing()

  console.log("✓ Airline prices seeded")

  // Service fees (PRD §8)
  await db
    .insert(serviceFees)
    .values([
      { key: "VISA", currency: "USD", amount: 165, label: "Visa Umroh Reguler", divideByPax: false },
      { key: "SISKOPATUH", currency: "IDR", amount: 200000, label: "Siskopatuh", divideByPax: false },
      { key: "TASREH", currency: "SAR", amount: 25, label: "Tasreh Raudhah", divideByPax: false },
      {
        key: "TRANSPORT",
        currency: "SAR",
        amount: 325,
        label: "Transportasi Full Rute (Staria)",
        divideByPax: true,
      },
      { key: "TOUR_MAKKAH", currency: "SAR", amount: 150, label: "Tour Ziarah Makkah", divideByPax: true },
      {
        key: "TOUR_MADINAH",
        currency: "SAR",
        amount: 150,
        label: "Tour Ziarah Madinah",
        divideByPax: true,
      },
    ])
    .onConflictDoNothing()

  console.log("✓ Service fees seeded")

  // Room multipliers (PRD §8 — seeded, not admin-editable)
  await db
    .insert(roomMultipliers)
    .values([
      { type: "QUAD", paxPerRoom: 4, multiplier: "1.0", label: "Quad", sublabel: "4 orang/kamar" },
      {
        type: "TRIPLE",
        paxPerRoom: 3,
        multiplier: "1.25",
        label: "Triple",
        sublabel: "3 orang/kamar",
      },
      {
        type: "DOUBLE",
        paxPerRoom: 2,
        multiplier: "1.5",
        label: "Double",
        sublabel: "2 orang/kamar",
      },
      {
        type: "SINGLE",
        paxPerRoom: 1,
        multiplier: "2.8",
        label: "Single",
        sublabel: "1 orang/kamar",
      },
    ])
    .onConflictDoNothing()

  console.log("✓ Room multipliers seeded")

  // Hotel monthly prices — seed each hotel's 12 months at the base price so admin can update peaks
  const allHotels = await db.select().from(hotelPrices)
  const monthlyRows = allHotels.flatMap((h) =>
    Array.from({ length: 12 }, (_, i) => ({
      hotelPriceId: h.id,
      month: i + 1,
      sarPerNight: h.sarPerNight,
    }))
  )
  await db.insert(hotelMonthlyPrices).values(monthlyRows).onConflictDoNothing()
  console.log("✓ Hotel monthly prices seeded")

  console.log("✅ Seeding complete!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
