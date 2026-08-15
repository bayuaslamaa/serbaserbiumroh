import { MessageCircle } from 'lucide-react';
import { layananConsultHref } from '@/packages/layanan/domain/catalog';
import { ANALYTICS_EVENTS } from '@/shared/analytics';
import { TrackedLink } from '@/components/atoms/tracked-link';
import { FullBleed } from '@/components/templates/full-bleed';
import { PageColumn } from '@/components/templates/page-column';

export const CtaBand = () => {
  return (
    <FullBleed className="-mb-6 mt-2 border-y border-[var(--color-border)] bg-[linear-gradient(90deg,rgba(44,107,66,0.18),rgba(201,168,76,0.08))]">
      <PageColumn>
        <section
          aria-label="Bantuan admin"
          className="flex flex-col items-start gap-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <div>
            <p
              className="mb-1 text-[22px] font-bold text-[var(--color-text)]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Masih bingung mulai dari mana?
            </p>
            <p className="text-[13.5px] text-[var(--color-text-muted)]">
              Tanya langsung ke admin — gratis, dijawab manusia, bukan bot.
            </p>
          </div>
          <TrackedLink
            event={ANALYTICS_EVENTS.CONTACT.CONSULT_CLICK}
            params={{ placement: 'home_cta_band' }}
            href={layananConsultHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2.5 rounded-lg bg-[var(--color-green)] px-[26px] py-[13px] text-[14.5px] font-bold text-[var(--color-text)] transition-colors hover:bg-[#35804f]"
          >
            <MessageCircle className="h-[17px] w-[17px]" aria-hidden />
            Chat Admin WhatsApp
          </TrackedLink>
        </section>
      </PageColumn>
    </FullBleed>
  );
};
