import { eq } from "drizzle-orm"

import { db } from "@/shared/db"
import { pilgrimStories } from "@/shared/db/schema"
import { buildStoryMeta } from "@/shared/stories/metadata"
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/shared/seo/og-image"

export const alt = "Cerita jamaah umroh mandiri di Serba Serbi Umroh"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  try {
    const [story] = await db.select().from(pilgrimStories).where(eq(pilgrimStories.slug, slug))

    if (story?.isPublished) {
      return renderOgImage(buildStoryMeta(story).title, "Cerita Jamaah")
    }
  } catch (error) {
    console.error(`OG image: could not load story ${slug}.`, error)
  }

  return renderOgImage("Cerita Jamaah Umroh Mandiri", "Cerita Jamaah")
}
