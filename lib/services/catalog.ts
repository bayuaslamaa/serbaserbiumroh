import {
  BedDouble,
  Bus,
  HeartHandshake,
  Stamp,
  TrainFront,
  UserCheck,
  type LucideIcon,
} from "lucide-react"
import { badalinPriceShort } from "@/lib/badalin/content"

// Admin WhatsApp — the same number used by WhatsAppFloatingButton and the visa page.
export const SSU_WHATSAPP_NUMBER = "6285161134844"

export function whatsappHref(message: string): string {
  return `https://wa.me/${SSU_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

export interface Service {
  id: string
  name: string
  /** Short blurb shown on the mega menu card and the /layanan card. */
  description: string
  /**
   * Display-only price line, never used in a calculation. Usually a
   * starting-from figure ("Mulai USD 165"), but some services quote a fee
   * instead ("+Rp 100 rb/orang"), so the string carries its own qualifier —
   * the renderers print it verbatim and do not prepend one.
   */
  price: string
  icon: LucideIcon
  href: string
  /** Renders the BARU badge and the highlighted card treatment. */
  isNew?: boolean
}

export const services: Service[] = [
  {
    id: "visa",
    name: "Visa Umroh",
    description:
      "Pengurusan visa umroh mandiri, cepat dan resmi tanpa harus lewat travel.",
    price: "Mulai USD 165",
    icon: Stamp,
    href: "/visa",
  },
  {
    id: "badalin",
    name: "Badalin — Badal Umroh",
    description:
      "Badal umroh amanah dengan dokumentasi video lengkap dan sertifikat.",
    price: `Mulai ${badalinPriceShort}`,
    icon: HeartHandshake,
    href: "/badalin",
    isNew: true,
  },
  {
    id: "transportasi",
    name: "Sewa Transportasi",
    description:
      "Antar-jemput bandara, Makkah–Madinah, dan city tour dengan driver Indonesia.",
    // Matches the cheapest figure /transportasi actually renders:
    // Sedan base 120 + the flat 50 SAR SSU fee.
    price: "Mulai SAR 170",
    icon: Bus,
    href: "/transportasi",
  },
  {
    id: "hotel",
    name: "Booking Hotel",
    description:
      "Pemesanan hotel Makkah & Madinah terverifikasi Nusuk, dekat Masjidil Haram.",
    price: "Mulai Rp 900 rb/malam",
    icon: BedDouble,
    href: "/hotel-nusuk",
  },
  {
    id: "hhr",
    name: "Jasa Booking HHR",
    description:
      "Kami bantu pesan Tiket kereta cepat Haramain Makkah–Madinah tanpa ribet akun Saudi.",
    price: "+Rp 100 rb/orang (tidak termasuk tiket)",
    icon: TrainFront,
    href: whatsappHref(
      "Assalamualaikum, saya ingin memesan tiket kereta cepat Haramain (HHR)."
    ),
  },
  {
    id: "muthowwif",
    name: "Muthowwif",
    description:
      "Pendamping ibadah berbahasa Indonesia untuk umroh yang tenang dan sah.",
    price: "Mulai Rp 1,4 jt/sesi",
    icon: UserCheck,
    href: whatsappHref(
      "Assalamualaikum, saya ingin memesan layanan muthowwif (pendamping ibadah)."
    ),
  },
]

export const layananConsultHref = whatsappHref(
  "Assalamualaikum, saya ingin konsultasi layanan Serba Serbi Umroh."
)

export const badalConsultHref = whatsappHref(
  "Assalamualaikum, saya ingin memesan layanan Badalin (badal umroh)."
)

/** True when the href leaves the app (WhatsApp), so links can set target/rel. */
export function isExternalHref(href: string): boolean {
  return href.startsWith("http")
}

/**
 * Border and surface treatment for a service card. Shared by all three card
 * densities (mega menu, mobile overlay, /layanan) so the "new service"
 * highlight cannot drift between them.
 */
export function serviceCardTreatment(isNew?: boolean) {
  return {
    borderColor: isNew ? "rgba(201,168,76,0.45)" : "rgba(201,168,76,0.16)",
    background: isNew ? "rgba(201,168,76,0.07)" : "rgba(255,255,255,0.02)",
  }
}
