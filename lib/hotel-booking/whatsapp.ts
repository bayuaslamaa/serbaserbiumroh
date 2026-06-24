type HotelBookingWhatsappOffer = {
  hotelName: string
  city: string
  offerLabel?: string | null
  periodLabel?: string | null
  periodStart: Date | string
  periodEnd: Date | string
  roomBasis: string
  currency: string
  priceAmount: number
}

export function formatHotelBookingPrice(currency: string, amount: number): string {
  return `${currency.toUpperCase()} ${amount.toLocaleString("id-ID")}`
}

export function formatHotelBookingPeriod(offer: Pick<HotelBookingWhatsappOffer, "periodLabel" | "periodStart" | "periodEnd">) {
  if (offer.periodLabel?.trim()) return offer.periodLabel.trim()
  return `${toDateString(offer.periodStart)} - ${toDateString(offer.periodEnd)}`
}

export function buildHotelBookingWhatsappMessage(offer: HotelBookingWhatsappOffer): string {
  const lines = [
    "Assalamu'alaikum Admin, saya ingin mengajukan booking hotel manual.",
    "",
    `Hotel: ${offer.hotelName}`,
    `Kota: ${offer.city}`,
    offer.offerLabel ? `Offer: ${offer.offerLabel}` : null,
    `Periode: ${formatHotelBookingPeriod(offer)}`,
    `Basis: ${offer.roomBasis}`,
    `Harga katalog: ${formatHotelBookingPrice(offer.currency, offer.priceAmount)}`,
    "",
    "Mohon dibantu cek ketersediaan akhir dan langkah booking berikutnya.",
  ]

  return lines.filter(Boolean).join("\n")
}

export function buildHotelBookingWhatsappHref(adminContact: string | undefined, offer: HotelBookingWhatsappOffer): string {
  const contact = (adminContact ?? "").trim()
  if (!contact) return ""

  const message = encodeURIComponent(buildHotelBookingWhatsappMessage(offer))

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
