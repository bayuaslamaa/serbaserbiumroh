import { describe, expect, it } from "vitest"
import {
  buildHotelBookingWhatsappHref,
  buildHotelBookingWhatsappMessage,
  formatHotelBookingPeriod,
  formatHotelBookingPrice,
} from "@/lib/hotel-booking/whatsapp"

const offer = {
  hotelName: "Safwa Tower 3",
  city: "MAKKAH",
  offerLabel: "Ramadan awal",
  periodLabel: "15 Feb - 5 Mar 2026",
  periodStart: new Date("2026-02-15T00:00:00.000Z"),
  periodEnd: new Date("2026-03-05T00:00:00.000Z"),
  roomBasis: "per kamar per malam, double",
  currency: "SAR",
  priceAmount: 1450,
}

describe("hotel booking WhatsApp helper", () => {
  it("formats price and period labels", () => {
    expect(formatHotelBookingPrice("sar", 1450)).toBe("SAR 1.450")
    expect(formatHotelBookingPeriod(offer)).toBe("15 Feb - 5 Mar 2026")
    expect(formatHotelBookingPeriod({ ...offer, periodLabel: "" })).toBe("2026-02-15 - 2026-03-05")
  })

  it("builds a request message without jamaah or payment data", () => {
    const message = buildHotelBookingWhatsappMessage(offer)

    expect(message).toContain("Safwa Tower 3")
    expect(message).toContain("Harga katalog: SAR 1.450")
    expect(message).toContain("cek ketersediaan akhir")
    expect(message).not.toContain("paspor")
    expect(message).not.toContain("payment")
  })

  it("builds encoded wa.me hrefs from phone numbers", () => {
    const href = buildHotelBookingWhatsappHref("+62 851-6113-4844", offer)

    expect(href).toContain("https://wa.me/6285161134844?text=")
    expect(decodeURIComponent(href)).toContain("Hotel: Safwa Tower 3")
  })

  it("appends text to configured WhatsApp urls", () => {
    const href = buildHotelBookingWhatsappHref("https://wa.me/6285161134844?source=site", offer)

    expect(href).toContain("&text=")
    expect(decodeURIComponent(href)).toContain("Offer: Ramadan awal")
  })

  it("returns an empty href when contact is missing", () => {
    expect(buildHotelBookingWhatsappHref("", offer)).toBe("")
    expect(buildHotelBookingWhatsappHref(undefined, offer)).toBe("")
  })
})
