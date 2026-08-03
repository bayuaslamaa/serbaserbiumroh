import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { PageColumn } from "@/components/layout/PageColumn"
import { CONTACT_NUMBERS, SOCIAL_LINKS, displayPhone, whatsappLink } from "@/lib/contact"

/**
 * The public footer.
 *
 * It lives in the public layout rather than on the homepage because every link
 * in it is site-level: before this, a visitor who reached the bottom of any
 * public page had no secondary navigation, no contact, and no route to the
 * paid services at all.
 *
 * Both admin numbers are listed by name. The site already routes people to
 * Nurul or Bayu by name elsewhere (the transportasi picker, the estimator's
 * closing line), and a footer that offers only one of them sends everyone to
 * the same inbox.
 */
const exploreLinks = [
  { href: "/panduan", label: "Panduan Umroh" },
  { href: "/cerita-jamaah", label: "Cerita Jamaah" },
  { href: "/komunitas", label: "Komunitas" },
  { href: "/webinar-umroh-mandiri", label: "Webinar Umroh Mandiri" },
  { href: "/faq", label: "FAQ" },
]

const serviceLinks = [
  { href: "/visa", label: "Visa Umroh" },
  { href: "/badalin", label: "Badalin — Badal Umroh" },
  { href: "/transportasi", label: "Sewa Transportasi" },
  { href: "/hotel-nusuk", label: "Booking Hotel" },
]

const columnHeadingClass =
  "text-xs font-bold uppercase tracking-[0.06em] text-[var(--color-green-text)]"
const linkClass = "text-[13.5px] text-[var(--color-text-soft)] transition-colors hover:text-gold"

export function SiteFooter() {
  return (
    <footer className="bg-[#081510]">
      <PageColumn className="grid grid-cols-1 gap-10 pt-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
        <div className="flex flex-col gap-3">
          <span className="flex items-baseline gap-2">
            <span
              className="text-xl font-bold text-gold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              SSU
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">Serba Serbi Umroh</span>
          </span>
          <p className="max-w-[260px] text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            Panduan, komunitas, dan layanan untuk jamaah umroh mandiri Indonesia. Belajar dulu,
            berangkat tenang.
          </p>
        </div>

        <nav className="flex flex-col gap-2.5" aria-label="Jelajahi">
          <span className={columnHeadingClass}>Jelajahi</span>
          {exploreLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="flex flex-col gap-2.5" aria-label="Layanan">
          <span className={columnHeadingClass}>Layanan</span>
          {serviceLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </Link>
          ))}
          <Link href="/layanan" className="text-[13.5px] font-bold text-gold hover:text-gold-hover">
            Semua layanan <span aria-hidden>&rarr;</span>
          </Link>
        </nav>

        <div className="flex flex-col gap-3">
          <span className={columnHeadingClass}>Kontak</span>
          {CONTACT_NUMBERS.map((contact) => (
            <a
              key={contact.number}
              href={whatsappLink(contact.number)}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 ${linkClass}`}
            >
              <MessageCircle className="h-[15px] w-[15px] shrink-0" aria-hidden />
              <span>
                {displayPhone(contact.number)}
                <span className="text-[var(--color-text-muted)]"> ({contact.name})</span>
              </span>
            </a>
          ))}
          <div className="flex flex-wrap gap-2.5">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(201,168,76,0.25)] text-[11px] font-bold text-gold transition-colors hover:border-[var(--color-gold)]"
              >
                <span aria-hidden>{social.short}</span>
              </a>
            ))}
          </div>
        </div>
      </PageColumn>

      <PageColumn className="mt-8 flex flex-col gap-2 border-t border-[rgba(201,168,76,0.12)] py-[18px] text-xs text-[var(--color-green-text)] sm:flex-row sm:justify-between sm:gap-4">
        <span>
          © {new Date().getFullYear()} Serba Serbi Umroh. Konten edukasi gratis untuk jamaah
          mandiri.
        </span>
        <span>Estimasi &amp; harga dapat berubah mengikuti kurs dan musim.</span>
      </PageColumn>
    </footer>
  )
}
