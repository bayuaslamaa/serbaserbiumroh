import { MONTH_NAMES_FULL, formatFullIdr } from "@/lib/hotels/pricing"
import { TIER_LABEL } from "@/lib/hotels/presentation"

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
