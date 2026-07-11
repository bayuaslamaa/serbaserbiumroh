type HotelBookingWhatsappOffer = {
  hotelName: string
  city: string
  offerLabel?: string | null
  roomType?: string | null
  rateLabel?: string | null
  periodLabel?: string | null
  periodStart: Date | string
  periodEnd: Date | string
  roomBasis: string
  currency: string
  priceAmount: number
}

type HotelBookingWhatsappQuote = {
  checkIn: string
  checkOut: string
  nights: number
  rooms: number
  adults: number
  currency: string
  pricePerNight: number
  totalAmount: number
}

export function formatHotelBookingPrice(currency: string, amount: number): string {
  return `${currency.toUpperCase()} ${amount.toLocaleString("id-ID")}`
}

export function formatHotelBookingPeriod(offer: Pick<HotelBookingWhatsappOffer, "periodLabel" | "periodStart" | "periodEnd">) {
  if (offer.periodLabel?.trim()) return offer.periodLabel.trim()
  return `${toDateString(offer.periodStart)} - ${toDateString(offer.periodEnd)}`
}

export function buildHotelBookingWhatsappMessage(
  offer: HotelBookingWhatsappOffer,
  quote?: HotelBookingWhatsappQuote
): string {
  const lines = [
    "Assalamu'alaikum Admin, saya ingin mengajukan booking hotel manual.",
    "",
    `Hotel: ${offer.hotelName}`,
    `Kota: ${offer.city}`,
    offer.offerLabel ? `Offer: ${offer.offerLabel}` : null,
    offer.roomType ? `Tipe kamar: ${offer.roomType}` : null,
    offer.rateLabel ? `Rate: ${offer.rateLabel}` : null,
    quote ? `Check-in: ${quote.checkIn}` : `Periode: ${formatHotelBookingPeriod(offer)}`,
    quote ? `Check-out: ${quote.checkOut}` : null,
    quote ? `Durasi: ${quote.nights} malam` : null,
    quote ? `Kamar: ${quote.rooms}` : null,
    quote ? `Tamu dewasa: ${quote.adults}` : null,
    `Basis: ${offer.roomBasis}`,
    quote
      ? `Harga katalog: ${formatHotelBookingPrice(quote.currency, quote.pricePerNight)} x ${quote.nights} malam x ${quote.rooms} kamar`
      : `Harga katalog: ${formatHotelBookingPrice(offer.currency, offer.priceAmount)}`,
    quote ? `Estimasi total: ${formatHotelBookingPrice(quote.currency, quote.totalAmount)}` : null,
    "",
    "Mohon dibantu cek ketersediaan akhir dan langkah booking/payment berikutnya.",
  ]

  return lines.filter(Boolean).join("\n")
}

export function buildHotelBookingWhatsappHref(
  adminContact: string | undefined,
  offer: HotelBookingWhatsappOffer,
  quote?: HotelBookingWhatsappQuote
): string {
  const contact = (adminContact ?? "").trim()
  if (!contact) return ""

  const message = encodeURIComponent(buildHotelBookingWhatsappMessage(offer, quote))

  if (/^https?:\/\//i.test(contact)) {
    const joiner = contact.includes("?") ? "&" : "?"
    return `${contact}${joiner}text=${message}`
  }

  const phone = contact.replace(/[^\d]/g, "")
  if (!phone) return ""
  return `https://wa.me/${phone}?text=${message}`
}

function toDateString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value.slice(0, 10)
}
