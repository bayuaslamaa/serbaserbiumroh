import {
  CalendarDays,
  Compass,
  HelpCircle,
  Hotel,
  Mail,
  MessageCircle,
  Newspaper,
  Tags,
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
  { href: "/artikel", label: "Artikel", icon: Newspaper },
  { href: "/cerita-jamaah", label: "Cerita Jamaah", icon: Users },
  { href: "/hotel-nusuk", label: "Hotel Nusuk", icon: Hotel },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/template-email", label: "Template Email", icon: Mail },
  { href: "/webinar-umroh-mandiri", label: "Webinar", icon: CalendarDays },
]

/** The mobile overlay's JELAJAHI section — every non-service destination. */
export const exploreLinks: NavLink[] = [
  { href: "/panduan", label: "Panduan", icon: Compass },
  { href: "/artikel", label: "Artikel", icon: Newspaper },
  { href: "/cerita-jamaah", label: "Cerita Jamaah", icon: Users },
  { href: "/hotel-nusuk", label: "Hotel Nusuk", icon: Hotel },
  { href: "/komunitas", label: "Komunitas", icon: MessageCircle },
  { href: "/webinar-umroh-mandiri", label: "Webinar", icon: CalendarDays },
  { href: "/template-email", label: "Template Email", icon: Mail },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
]

/**
 * Destinations that require a session but not the ADMIN role.
 *
 * A fourth array rather than extra entries in moreLinks or exploreLinks:
 * middleware.test.ts asserts every href in those two passes isPublicPath, and
 * that assertion is right -- a gated href in a nav rendered to anonymous
 * visitors is a link into the login wall. The mirror assertion covers this
 * array, so an href that quietly becomes public fails just as loudly.
 *
 * Render sites must gate on isLoggedIn: components/nav/MoreMenu.tsx (desktop
 * "Lainnya") and the AKUN section of components/nav/MobileMenu.tsx.
 */
export const memberLinks: NavLink[] = [
  { href: "/pricelist-hotel", label: "Pricelist Hotel", icon: Tags },
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
