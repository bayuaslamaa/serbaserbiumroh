import { MONTH_NAMES_FULL, formatFullIdr } from "@/shared/hotels/pricing"
import { TIER_LABEL } from "@/shared/hotels/presentation"

export interface StoryMetaSource {
  authorName: string
  departureCity: string
  travelMonth: number | null
  travelYear: number | null
  pax: number
  hotelTier: "ECONOMY" | "STANDARD" | "PELATARAN" | "PREMIUM"
  makkahNights: number
  madinahNights: number
  /** Total for the whole group, not per person -- see StoryDetail.tsx:40. */
  totalBudgetIdr: number
}

/**
 * A budget shortened to the unit an Indonesian reader expects, with the comma
 * decimal separator that locale uses: 27_400_000 -> "Rp 27,4 jt".
 *
 * Deliberately separate from lib/hotels/pricing's formatCompactIdr, which
 * renders "Rp 27.4jt" with a period. Hotel cards, the hotel detail page and
 * the pricing table all read that one, so correcting its separator is a change
 * to those surfaces rather than to this one.
 */
export function formatCompactBudget(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000
    const rounded = Math.round(millions * 10) / 10
    return `Rp ${rounded.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
  }
  if (amount >= 1_000) {
    return `Rp ${Math.round(amount / 1_000).toLocaleString("id-ID")} rb`
  }
  return `Rp ${Math.round(amount).toLocaleString("id-ID")}`
}

/**
 * The figures the homepage's story card leads with.
 *
 * The card is built around the cost per person because that is the number a
 * visitor came to find; everything else on the card qualifies it. Returns null
 * for `pricePerPax` when the story records no travellers, so a divide by zero
 * can never reach the page as "RpNaN".
 */
export function storyCardSummary(story: StoryMetaSource) {
  const nights = story.makkahNights + story.madinahNights
  const perPerson = story.pax > 0 ? Math.round(story.totalBudgetIdr / story.pax) : null
  const period = travelPeriod(story)

  return {
    pricePerPax: perPerson === null ? null : formatCompactBudget(perPerson),
    pax: `${story.pax} orang`,
    tier: TIER_LABEL[story.hotelTier],
    nights: nights > 0 ? `${nights} malam` : null,
    initial: story.authorName.trim().charAt(0).toUpperCase() || "?",
    meta: period ? `${story.departureCity} · ${period}` : story.departureCity,
  }
}

export function travelPeriod(story: StoryMetaSource): string | null {
  if (!story.travelYear) return null
  if (!story.travelMonth) return String(story.travelYear)

  const name = MONTH_NAMES_FULL[story.travelMonth - 1]
  return name ? `${name} ${story.travelYear}` : String(story.travelYear)
}

/**
 * Title and description assembled from the story's own numbers.
 *
 * These pages compete for very specific searches -- "umroh mandiri berdua
 * biaya", "itinerary umroh 9 hari" -- so the description has to carry the
 * actual figures rather than a generic sentence. Doing it from data means
 * every story gets a distinct description without anyone writing one.
 */
export function buildStoryMeta(story: StoryMetaSource) {
  const nights = story.makkahNights + story.madinahNights
  const period = travelPeriod(story)
  const perPerson = story.pax > 0 ? Math.round(story.totalBudgetIdr / story.pax) : null

  const titleParts = [
    `Cerita Umroh Mandiri ${story.authorName}`,
    `${story.pax} Orang`,
    nights > 0 ? `${nights} Malam` : null,
  ].filter(Boolean)

  const descriptionParts = [
    `Pengalaman umroh mandiri ${story.authorName} dari ${story.departureCity}`,
    period ? ` pada ${period}` : "",
    `: ${story.pax} jamaah`,
    nights > 0 ? `, ${story.makkahNights} malam Makkah dan ${story.madinahNights} malam Madinah` : "",
    `, hotel ${TIER_LABEL[story.hotelTier].toLowerCase()}`,
    perPerson ? `, sekitar ${formatFullIdr(perPerson)} per orang` : "",
    ". Lengkap dengan itinerary harian dan daftar bawaan.",
  ]

  return {
    title: titleParts.join(" — "),
    description: descriptionParts.join(""),
  }
}
