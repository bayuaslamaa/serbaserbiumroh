import { getGuideBySlug } from "@/shared/panduan"
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/shared/seo/og-image"

export const alt = "Panduan umroh mandiri dari Serba Serbi Umroh"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)

  return renderOgImage(guide?.title ?? "Panduan Umroh Mandiri", "Panduan")
}
