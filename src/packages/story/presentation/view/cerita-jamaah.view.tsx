import { db } from '@/shared/db';
import { pilgrimStories } from '@/shared/db/schema';
import { eq, desc } from 'drizzle-orm';
import { StoryFilters } from '@/packages/story/presentation/view/story-filters';

export const CeritaJamaahView = async () => {
  const stories = await db
    .select()
    .from(pilgrimStories)
    .where(eq(pilgrimStories.isPublished, true))
    .orderBy(desc(pilgrimStories.travelYear), desc(pilgrimStories.travelMonth));

  return (
    <div className="max-w-5xl mx-auto">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Cerita Jamaah
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
        Pengalaman nyata jamaah umroh mandiri lengkap dengan itinerary dan anggaran
      </p>

      {stories.length === 0 ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          Belum ada cerita yang dipublikasikan.
        </p>
      ) : (
        <StoryFilters stories={stories} />
      )}
    </div>
  );
};
