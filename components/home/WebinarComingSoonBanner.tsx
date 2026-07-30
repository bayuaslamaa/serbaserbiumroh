/**
 * Compact webinar announcement rendered above the homepage hero copy.
 *
 * Deliberately non-interactive: registration is not open yet, so the banner
 * carries no link, button, or form. A disabled-looking control would read as a
 * broken action rather than as information. The state is spelled out in words
 * ("COMING SOON", "Pendaftaran segera dibuka") so it never depends on colour.
 *
 * The headline is a <p>, not a heading. This component is the hero's first
 * child, so any heading here would land ahead of the page H1 in document
 * order and demote the homepage's strongest on-page signal.
 *
 * Campaign copy stays local: one fixed event, no scheduling or admin workflow
 * to serve yet.
 */
export function WebinarComingSoonBanner() {
  return (
    <div
      role="region"
      aria-label="Pengumuman webinar"
      className="relative mx-auto mb-7 flex max-w-[880px] flex-col gap-2.5 overflow-hidden rounded-2xl border bg-gradient-to-br from-[#12301d] via-[#0e271a] to-[#0b1c12] px-4 py-[18px] text-left shadow-[0_0_30px_rgba(201,168,76,0.08)] md:mb-10 md:flex-row md:items-center md:gap-7 md:px-7 md:py-[22px] md:shadow-[0_0_40px_rgba(201,168,76,0.08)]"
      // No token sits at the design's 35% gold, so derive it from the gold token rather than
      // hardcoding the hex. This is inline because Tailwind cannot apply an opacity modifier to a
      // `var()`-valued colour — `border-gold/35` would not produce 35% gold. It is NOT about the
      // global `* { border-color }` rule, which loses to any border-colour utility on specificity.
      style={{ borderColor: 'color-mix(in srgb, var(--color-gold) 35%, transparent)' }}
    >
      {/* Decoration is CSS and glyph only — no image asset at runtime. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[var(--color-gold)] opacity-[0.06] blur-2xl md:-right-14 md:-top-14 md:h-56 md:w-56 md:opacity-[0.05]"
      />
      {/* Crescent is desktop-only: at 375px it sits under the headline instead
          of beside it, which is exactly the competition the design warns about. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 font-heading text-6xl leading-none text-[var(--color-gold)] opacity-10 md:block"
      >
        ☾
      </span>

      {/* Left: pills, headline, supporting line */}
      <div className="relative flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          <span
            className="rounded-full bg-[var(--color-gold)] px-2.5 py-1 text-[10px] font-extrabold tracking-[0.12em] md:text-[11px]"
            style={{ color: 'var(--color-bg)' }}
          >
            WEBINAR GRATIS
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-bold tracking-[0.16em] md:text-[11px]"
            style={{ borderColor: 'var(--color-gold-muted)', color: 'var(--color-gold)' }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-gold)]"
            />
            COMING SOON
          </span>
        </div>

        <p
          className="font-heading text-[19px] font-extrabold leading-[1.3] md:text-[26px] md:leading-[1.25]"
          style={{ color: 'var(--color-text)' }}
        >
          Jangan Nekat Umroh Mandiri{' '}
          <span style={{ color: 'var(--color-gold)' }}>Sebelum Tahu Risiko Ini!</span>
        </p>

        <p
          className="hidden text-[13px] md:block"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Pantau informasi pendaftaran selanjutnya di Serba Serbi Umroh.
        </p>
      </div>

      {/* Right: schedule and the passive registration state. Separated by a
          rule above on mobile, beside on desktop. */}
      <div
        className="relative flex flex-col gap-2.5 border-t pt-2.5 md:flex-shrink-0 md:border-l md:border-t-0 md:pl-7 md:pt-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 md:flex-col md:items-start md:gap-0.5">
          <span
            className="hidden w-full text-[11px] uppercase tracking-[0.12em] md:block"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Jadwal
          </span>
          <span
            className="text-sm font-extrabold md:text-[17px]"
            style={{ color: 'var(--color-text)' }}
          >
            Ahad, 2 Agustus 2026
          </span>
          <span
            className="text-[13px] font-bold md:text-sm"
            style={{ color: 'var(--color-gold)' }}
          >
            09.00 WIB
          </span>
        </div>

        {/* Neutral dot, not gold, and not button-shaped: this is information,
            not an action waiting to be enabled. */}
        <p
          className="inline-flex items-center gap-2 text-xs font-semibold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span
            aria-hidden="true"
            className="inline-block h-[7px] w-[7px] flex-shrink-0 rounded-full bg-[var(--color-text-muted)]"
          />
          Pendaftaran segera dibuka
        </p>
      </div>
    </div>
  )
}
