import { MONTH_NAMES_FULL, formatFullIdr } from '@/packages/hotel/domain/pricing';
import { TIER_LABEL } from '@/packages/hotel/domain/presentation';

export interface StoryMetaSource {
  authorName: string;
  departureCity: string;
  travelMonth: number | null;
  travelYear: number | null;
  pax: number;
  hotelTier: 'ECONOMY' | 'STANDARD' | 'PELATARAN' | 'PREMIUM';
  makkahNights: number;
  madinahNights: number;
  totalBudgetIdr: number;
}

export const formatCompactBudget = (amount: number): string => {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const rounded = Math.round(millions * 10) / 10;
    return `Rp ${rounded.toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${Math.round(amount / 1_000).toLocaleString('id-ID')} rb`;
  }
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
};

export const storyCardSummary = (story: StoryMetaSource) => {
  const nights = story.makkahNights + story.madinahNights;
  const perPerson = story.pax > 0 ? Math.round(story.totalBudgetIdr / story.pax) : null;
  const period = travelPeriod(story);

  return {
    pricePerPax: perPerson === null ? null : formatCompactBudget(perPerson),
    pax: `${story.pax} orang`,
    tier: TIER_LABEL[story.hotelTier],
    nights: nights > 0 ? `${nights} malam` : null,
    initial: story.authorName.trim().charAt(0).toUpperCase() || '?',
    meta: period ? `${story.departureCity} · ${period}` : story.departureCity,
  };
};

export const travelPeriod = (story: StoryMetaSource): string | null => {
  if (!story.travelYear) return null;
  if (!story.travelMonth) return String(story.travelYear);

  const name = MONTH_NAMES_FULL[story.travelMonth - 1];
  return name ? `${name} ${story.travelYear}` : String(story.travelYear);
};

export const buildStoryMeta = (story: StoryMetaSource) => {
  const nights = story.makkahNights + story.madinahNights;
  const period = travelPeriod(story);
  const perPerson = story.pax > 0 ? Math.round(story.totalBudgetIdr / story.pax) : null;

  const titleParts = [
    `Cerita Umroh Mandiri ${story.authorName}`,
    `${story.pax} Orang`,
    nights > 0 ? `${nights} Malam` : null,
  ].filter(Boolean);

  const descriptionParts = [
    `Pengalaman umroh mandiri ${story.authorName} dari ${story.departureCity}`,
    period ? ` pada ${period}` : '',
    `: ${story.pax} jamaah`,
    nights > 0
      ? `, ${story.makkahNights} malam Makkah dan ${story.madinahNights} malam Madinah`
      : '',
    `, hotel ${TIER_LABEL[story.hotelTier].toLowerCase()}`,
    perPerson ? `, sekitar ${formatFullIdr(perPerson)} per orang` : '',
    '. Lengkap dengan itinerary harian dan daftar bawaan.',
  ];

  return {
    title: titleParts.join(' — '),
    description: descriptionParts.join(''),
  };
};
