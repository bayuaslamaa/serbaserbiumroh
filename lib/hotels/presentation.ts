export const CITY_LANDMARK = {
  MAKKAH: "Masjidil Haram",
  MADINAH: "Masjid Nabawi",
} as const

export const CITY_LABEL = {
  MAKKAH: "Makkah",
  MADINAH: "Madinah",
} as const

export const TIER_LABEL = {
  ECONOMY: "Ekonomi",
  STANDARD: "Standar",
  PELATARAN: "Pelataran",
  PREMIUM: "Premium",
} as const

interface BookingUrls {
  bookingUrl: string | null
  agodaUrl: string | null
  bookingcomUrl: string | null
  tripcomUrl: string | null
}

/**
 * Every booking link a hotel has, in the order we prefer to offer them.
 *
 * The directory cards show only the first; the detail page has room for all
 * of them, which is part of what makes a detail page worth its own URL.
 */
export function bookingLinks(hotel: BookingUrls): Array<{ href: string; label: string }> {
  const candidates: Array<[string | null, string]> = [
    [hotel.bookingUrl, "Booking"],
    [hotel.agodaUrl, "Agoda"],
    [hotel.bookingcomUrl, "Booking.com"],
    [hotel.tripcomUrl, "Trip.com"],
  ]

  return candidates
    .filter(([href]) => Boolean(href))
    .map(([href, label]) => ({ href: href!, label }))
}
