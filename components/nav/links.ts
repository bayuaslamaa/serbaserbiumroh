import {
  CalendarDays,
  Compass,
  HelpCircle,
  Hotel,
  MessageCircle,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

/** Secondary destinations behind the desktop "Lainnya" dropdown. */
export const moreLinks: NavLink[] = [
  { href: "/cerita-jamaah", label: "Cerita Jamaah", icon: Users },
  { href: "/hotel-nusuk", label: "Hotel Nusuk", icon: Hotel },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/webinar-umroh-mandiri", label: "Webinar", icon: CalendarDays },
]

/** The mobile overlay's JELAJAHI section — every non-service destination. */
export const exploreLinks: NavLink[] = [
  { href: "/panduan", label: "Panduan", icon: Compass },
  { href: "/cerita-jamaah", label: "Cerita Jamaah", icon: Users },
  { href: "/hotel-nusuk", label: "Hotel Nusuk", icon: Hotel },
  { href: "/komunitas", label: "Komunitas", icon: MessageCircle },
  { href: "/webinar-umroh-mandiri", label: "Webinar", icon: CalendarDays },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
]

/**
 * Admin sub-pages. There is no /admin index route, so these stay reachable as
 * an expandable group rather than collapsing to a single "Panel Admin" link.
 */
export const adminLinks: { href: string; label: string }[] = [
  { href: "/admin/pricing", label: "Kelola Harga" },
  { href: "/admin/users", label: "Kelola User" },
  { href: "/admin/community-requests", label: "Pengajuan Komunitas" },
  { href: "/admin/content/stories", label: "Kelola Cerita" },
  { href: "/admin/content/hotels", label: "Kelola Hotel" },
  { href: "/admin/content/faqs", label: "Kelola FAQ" },
  { href: "/admin/visitor-stats", label: "Statistik Pengunjung" },
]
