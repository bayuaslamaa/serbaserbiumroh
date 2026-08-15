import type { Props } from '@/packages/hotel/presentation/view/hotel-nusuk-detail.view';
import { getAllHotelSlugs, getHotelDetailBySlug } from '@/packages/hotel/domain/detail';
import { CITY_LABEL, CITY_LANDMARK, TIER_LABEL } from '@/packages/hotel/domain/presentation';
import { formatFullIdr, priceRange } from '@/packages/hotel/domain/pricing';
import { pageMetadata } from '@/shared/seo/metadata';
import { HotelNusukDetailView } from '@/packages/hotel/presentation/view/hotel-nusuk-detail.view';

export const revalidate = 3600;

export const dynamicParams = true;

export const generateStaticParams = async () => {
  const slugs = await getAllHotelSlugs();
  return slugs.map((slug) => ({ slug }));
};

export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params;
  const hotel = await getHotelDetailBySlug(slug);
  if (!hotel) return {};

  const city = CITY_LABEL[hotel.city];
  const range = priceRange(hotel.monthlyPrices);

  const priceSentence = range
    ? range.min === range.max
      ? `Estimasi ${formatFullIdr(range.min)} per kamar per malam.`
      : `Estimasi ${formatFullIdr(range.min)}–${formatFullIdr(range.max)} per kamar per malam tergantung bulan.`
    : '';
  const distanceSentence = hotel.distance
    ? ` Jarak ${hotel.distance} ke ${CITY_LANDMARK[hotel.city]}.`
    : '';

  return pageMetadata({
    title: `${hotel.label} — Harga Kamar per Malam, ${city}`,
    description:
      `${hotel.label}, hotel ${TIER_LABEL[hotel.tier].toLowerCase()} di ${city} untuk umroh mandiri. ` +
      `${priceSentence}${distanceSentence}`.trim(),
    path: `/hotel-nusuk/${slug}`,
  });
};

export default HotelNusukDetailView;
