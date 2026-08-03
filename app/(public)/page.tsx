import { db } from '@/lib/db'
import { pilgrimStories } from '@/lib/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { HeroSection } from '@/components/home/HeroSection'
import { PromoWebinar } from '@/components/home/PromoWebinar'
import { SectionCards } from '@/components/home/SectionCards'
import { FeaturedStories } from '@/components/home/FeaturedStories'
import { CtaBand } from '@/components/home/CtaBand'
import { getPublicVisitorCount } from '@/lib/stats/visitor-count'
import { auth } from '@/auth'

export default async function HomePage() {
  const [featured, session, visitorCount] = await Promise.all([
    db
      .select()
      .from(pilgrimStories)
      .where(and(eq(pilgrimStories.isPublished, true), eq(pilgrimStories.isFeatured, true)))
      // Newest first rather than whatever order the planner returns: with more
      // than three featured stories, an unordered limit picks an arbitrary
      // three and can quietly change them between requests.
      .orderBy(desc(pilgrimStories.createdAt))
      .limit(3),
    auth(),
    getPublicVisitorCount(),
  ])

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="max-w-6xl mx-auto">
      {/*
        Section order is the visit: set the scene, show the map, then the
        supporting material. The webinar archive sits below the navigation grid
        because it is a record of past sessions — as the page's loudest block
        directly under the hero, it outshouted the map of the site itself.
      */}
      <HeroSection visitorCount={visitorCount} />
      <SectionCards isAdmin={isAdmin} />
      <PromoWebinar />
      <FeaturedStories stories={featured} />
      <CtaBand />
    </div>
  )
}
