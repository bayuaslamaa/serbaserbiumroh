import Link from 'next/link';
import type { PilgrimStory } from '@/shared/db/schema';
import { storyCardSummary } from '@/packages/story/domain/metadata';

interface FeaturedStoriesProps {
  stories: PilgrimStory[];
}

export const FeaturedStories = ({ stories }: FeaturedStoriesProps) => {
  if (stories.length === 0) return null;

  return (
    <section className="pb-14 pt-12">
      <div className="mb-[18px] flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <div>
          <h2
            className="mb-1 text-2xl font-bold text-gold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Berapa Biaya Riil Umroh Mandiri?
          </h2>
          <p className="text-[13.5px] text-[var(--color-text-muted)]">
            Angka asli dari jamaah yang sudah berangkat — bukan estimasi.
          </p>
        </div>
        <Link
          href="/cerita-jamaah"
          className="shrink-0 text-[13px] font-bold text-gold hover:text-gold-hover"
        >
          Lihat semua cerita <span aria-hidden>&rarr;</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => {
          const summary = storyCardSummary(story);
          const badges = [summary.pax, summary.tier, summary.nights].filter(Boolean);

          return (
            <Link
              key={story.id}
              href={`/cerita-jamaah/${story.slug}`}
              className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-[22px] transition-all hover:border-[var(--color-gold-muted)] hover:shadow-[0_0_24px_rgba(201,168,76,0.10)]"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-green-text)]">
                Total per orang
              </span>
              <span
                className="text-3xl font-bold leading-none text-gold"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {summary.pricePerPax ?? 'Belum dirinci'}
              </span>
              <span className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-[var(--color-border)] px-2.5 py-[3px] text-[11.5px] text-[var(--color-text-muted)]"
                  >
                    {badge}
                  </span>
                ))}
              </span>
              <span className="mt-1.5 flex items-center gap-2.5 border-t border-[rgba(201,168,76,0.12)] pt-3.5">
                <span
                  aria-hidden
                  className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.12)] text-xs font-bold text-gold"
                >
                  {summary.initial}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-semibold text-[var(--color-text)]">
                    {story.authorName}
                  </span>
                  <span className="truncate text-[11.5px] text-[var(--color-text-muted)]">
                    {summary.meta}
                  </span>
                </span>
                <span aria-hidden className="ml-auto text-[13px] text-gold">
                  &rarr;
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
