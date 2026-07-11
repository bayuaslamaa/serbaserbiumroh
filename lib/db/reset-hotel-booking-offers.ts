import { count } from "drizzle-orm"
import { db } from "./index"
import { hotelBookingOffers } from "./schema"

const args = new Set(process.argv.slice(2))
const confirmed = args.has("--yes")
const help = args.has("--help") || args.has("-h")

function printUsage() {
  console.log(`
Reset hotel booking offers

Usage:
  npm run db:reset:hotel-booking-offers -- --yes
  npm run db:reset:hotel-booking-offers -- --dry-run

Options:
  --yes      Delete all rows from hotel_booking_offers
  --dry-run  Show how many rows would be deleted
  --help     Show this message
`.trim())
}

async function getOfferCount() {
  const [result] = await db.select({ value: count() }).from(hotelBookingOffers)
  return result?.value ?? 0
}

async function resetHotelBookingOffers() {
  if (help) {
    printUsage()
    process.exit(0)
  }

  const before = await getOfferCount()

  if (args.has("--dry-run")) {
    console.log(`Dry run: ${before} hotel booking offer row(s) would be deleted.`)
    process.exit(0)
  }

  if (!confirmed) {
    console.error("Refusing to reset hotel_booking_offers without --yes.")
    printUsage()
    process.exit(1)
  }

  await db.delete(hotelBookingOffers)

  const after = await getOfferCount()
  console.log(`Deleted ${before - after} hotel booking offer row(s). Remaining rows: ${after}.`)
  process.exit(0)
}

resetHotelBookingOffers().catch((error) => {
  console.error("Failed to reset hotel booking offers:", error)
  process.exit(1)
})
