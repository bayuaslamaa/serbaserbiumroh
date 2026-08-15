import { notFound } from "next/navigation"

import { JsonLd } from "@/components/seo/json-ld"
import { HotelDetail } from "@/components/hotel-nusuk/hotel-detail"
import { getAllHotelSlugs, getHotelDetailBySlug } from "@/shared/hotels/detail"
import { CITY_LABEL, CITY_LANDMARK, TIER_LABEL } from "@/shared/hotels/presentation"
import { formatFullIdr, priceRange } from "@/shared/hotels/pricing"
import { buildBreadcrumbSchema } from "@/shared/seo/schema"
import { pageMetadata } from "@/shared/seo/metadata"

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

// Slugs missing from the build-time list still render on demand. This matters
// because generateStaticParams returns an empty list when the database is
// unreachable at build -- the deploy should degrade to on-demand rendering,
// not fail.
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await getAllHotelSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const hotel = await getHotelDetailBySlug(slug)
  if (!hotel) return {}

  const city = CITY_LABEL[hotel.city]
  const range = priceRange(hotel.monthlyPrices)

  // Built from this hotel's own facts so no two descriptions read alike --
  // eighty-seven pages sharing one sentence would read as generated.
  const priceSentence = range
    ? range.min === range.max
      ? `Estimasi ${formatFullIdr(range.min)} per kamar per malam.`
      : `Estimasi ${formatFullIdr(range.min)}–${formatFullIdr(range.max)} per kamar per malam tergantung bulan.`
    : ""
  const distanceSentence = hotel.distance
    ? ` Jarak ${hotel.distance} ke ${CITY_LANDMARK[hotel.city]}.`
    : ""

  return pageMetadata({
    title: `${hotel.label} — Harga Kamar per Malam, ${city}`,
    description:
      `${hotel.label}, hotel ${TIER_LABEL[hotel.tier].toLowerCase()} di ${city} untuk umroh mandiri. ` +
      `${priceSentence}${distanceSentence}`.trim(),
    path: `/hotel-nusuk/${slug}`,
  })
}

export default async function HotelDetailPage({ params }: Props) {
  const { slug } = await params
  const hotel = await getHotelDetailBySlug(slug)
  if (!hotel) notFound()

  // BreadcrumbList only. Deliberately not Hotel or Offer schema: SSU is not
  // the accommodation provider and these are planning estimates, not bookable
  // offers -- marking them up as Offer would misrepresent the page.
  const breadcrumb = buildBreadcrumbSchema([
    { name: "Beranda", path: "/" },
    { name: "Hotel Nusuk", path: "/hotel-nusuk" },
    { name: hotel.label, path: `/hotel-nusuk/${slug}` },
  ])

  return (
    <>
      <JsonLd data={breadcrumb} />
      <HotelDetail hotel={hotel} />
    </>
  )
}
