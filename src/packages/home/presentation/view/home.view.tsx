import { db } from '@/shared/db';
import { pilgrimStories } from '@/shared/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { HeroSection } from '@/packages/home/presentation/view/hero-section';
import { PromoWebinar } from '@/packages/home/presentation/view/promo-webinar';
import { SectionCards } from '@/packages/home/presentation/view/section-cards';
import { FeaturedStories } from '@/packages/home/presentation/view/featured-stories';
import { CtaBand } from '@/packages/home/presentation/view/cta-band';
import { getPublicVisitorCount } from '@/packages/stats/domain/visitor-count';
import { auth } from '@/shared/auth/next-auth';

export const HomeView = async () => {
  const [featured, session, visitorCount] = await Promise.all([
    db
      .select()
      .from(pilgrimStories)
      .where(and(eq(pilgrimStories.isPublished, true), eq(pilgrimStories.isFeatured, true)))
      .orderBy(desc(pilgrimStories.createdAt))
      .limit(3),
    auth(),
    getPublicVisitorCount(),
  ]);

  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="max-w-6xl mx-auto">
      <HeroSection visitorCount={visitorCount} />
      <SectionCards isAdmin={isAdmin} />
      <PromoWebinar />
      <FeaturedStories stories={featured} />
      <CtaBand />
    </div>
  );
};
