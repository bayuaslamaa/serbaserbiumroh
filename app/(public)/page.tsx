import { db } from '@/lib/db'
import { pilgrimStories } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { HeroSection } from '@/components/home/HeroSection'
import { SectionCards } from '@/components/home/SectionCards'
import { FeaturedStories } from '@/components/home/FeaturedStories'

export default async function HomePage() {
  const featured = await db
    .select()
    .from(pilgrimStories)
    .where(and(eq(pilgrimStories.isPublished, true), eq(pilgrimStories.isFeatured, true)))
    .limit(3)

  return (
    <div className="max-w-6xl mx-auto">
      <HeroSection />
      <SectionCards />
      <FeaturedStories stories={featured} />
    </div>
  )
}
