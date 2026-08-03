import Link from 'next/link'

// Newest first: the recording a visitor is most likely to have been sent here
// for is the one from the session that just ran.
//
// Every entry states its own copy, deliberately. These are archive records: the
// title and meta line describe the session that was recorded, so they must not
// be read from lib/webinar's campaign constants — scheduling the next webinar
// edits those, which would relabel this card with the new event while it still
// opened the old video.
const recordings = [
  {
    id: 'webinar-risiko',
    title: 'Jangan Nekat Umroh Mandiri Sebelum Tahu Risiko Ini!',
    meta: 'Webinar · 2 Agustus 2026',
    url: 'https://youtu.be/qLuAmsjkH2Y',
    thumbnail: 'https://img.youtube.com/vi/qLuAmsjkH2Y/hqdefault.jpg',
  },
  {
    id: 'webinar',
    title: 'Webinar A-Z Umroh Mandiri',
    meta: 'Webinar · panduan lengkap A sampai Z',
    url: 'https://youtu.be/qkeENfXQg8I',
    thumbnail: 'https://img.youtube.com/vi/qkeENfXQg8I/hqdefault.jpg',
  },
  {
    id: 'manasik',
    title: 'Manasik Online — Ustadz M. Singgih Pamungkas',
    meta: 'Manasik · S3 Universitas Islam Madinah',
    url: 'https://youtu.be/zw4s8_KnxKQ',
    thumbnail: 'https://img.youtube.com/vi/zw4s8_KnxKQ/hqdefault.jpg',
  },
]

/**
 * The recording archive, deliberately quiet.
 *
 * It used to open with a gradient panel, two glows and three large thumbnails
 * directly under the hero, which made a page of past sessions louder than the
 * map of the site itself. It is reference material, so it now reads as a row.
 */
export function PromoWebinar() {
  return (
    <section className="pb-3 pt-12">
      <div className="mb-[18px] flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between md:gap-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2
            className="text-2xl font-bold text-gold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Rekaman Webinar &amp; Manasik
          </h2>
          <span className="rounded-full border border-[rgba(224,133,133,0.35)] px-2.5 py-0.5 text-[11.5px] font-bold tracking-wider text-[var(--color-danger-text)]">
            GRATIS DI YOUTUBE
          </span>
        </div>
        <span className="shrink-0 text-[13px] text-[var(--color-text-muted)]">
          Rutin &amp; 100% gratis — pantengin akun{' '}
          <span className="text-gold">Serba Serbi Umroh</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recordings.map((rec) => (
          <Link
            key={rec.id}
            href={rec.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 rounded-[10px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] p-3 transition-colors hover:border-[var(--color-gold-muted)]"
          >
            <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-black">
              {/*
                A remote YouTube JPEG below the fold, so it is never the LCP
                candidate — deferring the fetch keeps the card count off the
                homepage's initial payload as recordings are added. hqdefault
                rather than maxresdefault: YouTube does not generate the
                max-resolution still for every upload, and a missing one falls
                back to a stretched 120x90 placeholder.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rec.thumbnail}
                alt={rec.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-85"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(201,168,76,0.92)] text-[11px] text-[var(--color-bg)]"
                >
                  ▶
                </span>
              </span>
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[13.5px] font-bold leading-snug text-[var(--color-text)]">
                {rec.title}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">{rec.meta}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
