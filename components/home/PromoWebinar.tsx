import Link from 'next/link'
import { Youtube, Play } from 'lucide-react'
import { WEBINAR_DATE_LABEL, WEBINAR_HEADLINE } from '@/lib/webinar'

// Newest first: the recording a visitor is most likely to have been sent here
// for is the one from the session that just ran.
const recordings = [
  {
    id: 'webinar-risiko',
    // Reuses the campaign wording from lib/webinar rather than restating it, so
    // the card a visitor lands on says what the announcement they clicked said.
    title: WEBINAR_HEADLINE,
    description: `Rekaman webinar gratis ${WEBINAR_DATE_LABEL} — risiko umroh mandiri yang paling sering diabaikan, dan cara mengantisipasinya.`,
    url: 'https://youtu.be/Cv8flQcwTH4',
    thumbnail: `https://img.youtube.com/vi/Cv8flQcwTH4/maxresdefault.jpg`,
    badge: 'Webinar',
    narasumber: null,
    narasumberSub: null,
  },
  {
    id: 'webinar',
    title: 'Webinar A-Z Umroh Mandiri',
    description: 'Panduan lengkap merencanakan dan menjalankan ibadah umroh secara mandiri — dari A sampai Z.',
    url: 'https://youtu.be/qkeENfXQg8I?si=jwabOtyEbmUil0a6',
    thumbnail: `https://img.youtube.com/vi/qkeENfXQg8I/maxresdefault.jpg`,
    badge: 'Webinar',
    narasumber: null,
    narasumberSub: null,
  },
  {
    id: 'manasik',
    title: 'Manasik Online bersama Ustadz Muhammad Singgih Pamungkas',
    description: 'Tata cara ibadah umroh sesuai sunnah, persiapan ruhani, dan tips praktis di tanah suci.',
    url: 'https://youtu.be/zw4s8_KnxKQ?si=7QrEHr6rwAxv3giV',
    thumbnail: `https://img.youtube.com/vi/zw4s8_KnxKQ/maxresdefault.jpg`,
    badge: 'Manasik Online',
    narasumber: 'Ustadz Muhammad Singgih Pamungkas',
    narasumberSub: 'S3 Universitas Islam Madinah',
  },
]

export function PromoWebinar() {
  return (
    <section className="py-6 md:py-10">
      <div
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0e271a] via-[#0b1c12] to-[#122e1d] p-5 md:p-10 shadow-2xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(201,168,76,0.15)] group"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Glow effects */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[var(--color-gold)] opacity-[0.03] rounded-full blur-3xl pointer-events-none group-hover:opacity-[0.06] transition-opacity duration-700" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[var(--color-green)] opacity-[0.05] rounded-full blur-3xl pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700" />

        <div className="relative z-10 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="space-y-2 md:space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
              <Youtube className="w-3.5 h-3.5" />
              REKAMAN SUDAH TAYANG
            </div>

            <h2
              className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-wide font-serif"
              style={{ color: 'var(--color-gold)' }}
            >
              Rekaman Lengkap{' '}
              <span className="text-white">Sudah Tersedia!</span>
            </h2>

            <p
              className="text-sm leading-relaxed max-w-2xl"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Nggak sempat hadir live? Atau mau nonton ulang? Rekamannya sudah kami upload di YouTube — tonton santai
              sambil ngopi, sambil nyatet, atau share ke keluarga yang mau umroh 🤲
            </p>
          </div>

          {/* Recording Cards */}
          {/* Three cards now: two across at tablet width would strand the third
              on a half-empty row, so the grid opens to three columns at lg. */}
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {recordings.map((rec) => (
              <Link
                key={rec.id}
                href={rec.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/card relative overflow-hidden rounded-xl border transition-all duration-300 hover:border-[var(--color-gold)]/50 hover:shadow-[0_0_24px_rgba(201,168,76,0.12)] active:scale-[0.98] bg-[#0b1c12]/60 backdrop-blur-sm
                           flex flex-row md:flex-col"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {/* Thumbnail — sidebar on mobile, full-width on desktop */}
                <div className="relative flex-shrink-0 w-28 sm:w-36 md:w-full md:aspect-video overflow-hidden bg-black/40 self-stretch md:self-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={rec.thumbnail}
                    alt={rec.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 opacity-80 group-hover/card:opacity-100"
                  />
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full bg-[var(--color-gold)]/90 flex items-center justify-center shadow-lg transition-all duration-300 group-hover/card:scale-110 group-hover/card:bg-[var(--color-gold)]">
                      <Play className="w-4 h-4 md:w-6 md:h-6 text-[#0b1c12] fill-[#0b1c12] ml-0.5" />
                    </div>
                  </div>
                  {/* Badge — hidden on mobile to save space */}
                  <div className="absolute top-2 left-2 hidden sm:block md:block">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-gold)]/90 text-[#0b1c12]">
                      {rec.badge}
                    </span>
                  </div>
                  {/* YouTube icon */}
                  <div className="absolute bottom-2 right-2 hidden md:block">
                    <Youtube className="w-4 h-4 text-red-500 drop-shadow" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 p-3 md:p-4 gap-1 md:gap-2 min-w-0">
                  {/* Badge shown inline on mobile */}
                  <span className="inline-block sm:hidden px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-gold)]/90 text-[#0b1c12] self-start">
                    {rec.badge}
                  </span>

                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-white leading-snug group-hover/card:text-[var(--color-gold)] transition-colors duration-200 line-clamp-3 md:line-clamp-none">
                    {rec.title}
                  </h3>

                  <p
                    className="text-[11px] sm:text-xs leading-relaxed hidden sm:block"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {rec.description}
                  </p>

                  {rec.narasumber && (
                    <div className="hidden sm:block">
                      <p className="text-[11px] sm:text-xs font-semibold text-[var(--color-gold)]">
                        {rec.narasumber}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {rec.narasumberSub}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[var(--color-gold)]">
                    <span>Tonton di YouTube</span>
                    <span className="transition-transform duration-200 group-hover/card:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Footer note */}
          <p
            className="text-[11px] sm:text-xs text-center leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            📌 Insya Allah kegiatan seperti ini akan kami adakan rutin dan tetap{' '}
            <span className="font-semibold text-white">100% GRATIS</span>. Pantengin terus akun{' '}
            <span className="text-[var(--color-gold)]">Serba Serbi Umroh</span> biar nggak ketinggalan sesi berikutnya!
          </p>
        </div>
      </div>
    </section>
  )
}
