import { SSU_WHATSAPP_NUMBER } from "@/shared/services/catalog"

/**
 * Who a visitor can reach and where.
 *
 * The two admin numbers were already spread across the transportasi picker,
 * the estimator's closing line and the PDF summary, each spelling them out
 * again; the social URLs were spelled out on the webinar page. This module is
 * the one place to change either.
 *
 * Nurul's number is re-exported from the services catalog rather than copied:
 * whatsappHref and every service CTA read it from there, so a second literal
 * here could drift from the number the rest of the site actually dials.
 */
export interface ContactNumber {
  /** Who answers — visitors ask for people by name, not by role. */
  name: string
  /** International format, digits only, as wa.me expects. */
  number: string
}

export const CONTACT_NUMBERS: ContactNumber[] = [
  { name: "Nurul", number: SSU_WHATSAPP_NUMBER },
  { name: "Bayu", number: "6285172117757" },
]

/**
 * Spelled out as a union rather than inferred from the array, so socialHref's
 * argument is checked at compile time — a caller asking for a profile the site
 * does not have fails the build instead of throwing in production.
 */
export type SocialLabel = "YouTube" | "Instagram" | "TikTok" | "Facebook Badalin By Bazanyc"

export interface SocialLink {
  label: SocialLabel
  href: string
  /** Two-letter mark shown in the footer badge. */
  short: string
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: "YouTube", href: "https://youtube.com/@serbaserbiumroh", short: "YT" },
  { label: "Instagram", href: "https://www.instagram.com/bayuaslama_", short: "IG" },
  { label: "TikTok", href: "https://www.tiktok.com/@bayuaslama_", short: "TT" },
  {
    label: "Facebook Badalin By Bazanyc",
    href: "https://www.facebook.com/badalinbybazanyc",
    short: "FB",
  },
]

/**
 * One social profile's URL by label, for callers that link a single account
 * rather than rendering the whole set. Throws on an unknown label so a typo
 * fails the build rather than shipping an empty href.
 */
export function socialHref(label: SocialLabel): string {
  const match = SOCIAL_LINKS.find((social) => social.label === label)
  if (!match) throw new Error(`Unknown social profile: ${label}`)
  return match.href
}

/** "6285161134844" -> "+62 851-6113-4844", the way the number is read aloud. */
export function displayPhone(number: string): string {
  const national = number.replace(/^62/, "")
  return `+62 ${national.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3")}`
}

/** The wa.me link for a contact, optionally opening with a prefilled message. */
export function whatsappLink(number: string, message?: string): string {
  const base = `https://wa.me/${number}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
