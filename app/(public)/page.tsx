import { db } from '@/lib/db'
import { pilgrimStories } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { HeroSection } from '@/components/home/HeroSection'
import { PromoWebinar } from '@/components/home/PromoWebinar'
import { SectionCards } from '@/components/home/SectionCards'
import { FeaturedStories } from '@/components/home/FeaturedStories'
import { getPublicVisitorCount } from '@/lib/stats/visitor-count'
import { auth } from '@/auth'

export default async function HomePage() {
  const [featured, session, visitorCount] = await Promise.all([
    db
      .select()
      .from(pilgrimStories)
      .where(and(eq(pilgrimStories.isPublished, true), eq(pilgrimStories.isFeatured, true)))
      .limit(3),
    auth(),
    getPublicVisitorCount(),
  ])

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="max-w-6xl mx-auto">
      <HeroSection isAdmin={isAdmin} visitorCount={visitorCount} />
      <PromoWebinar />
      <SectionCards isAdmin={isAdmin} />
      <FeaturedStories stories={featured} />
    </div>
  )
}
