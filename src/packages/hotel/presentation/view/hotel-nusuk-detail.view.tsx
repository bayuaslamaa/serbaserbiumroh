import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/atoms/json-ld';
import { HotelDetail } from '@/packages/hotel/presentation/view/hotel-detail';
import { getAllHotelSlugs, getHotelDetailBySlug } from '@/packages/hotel/domain/detail';
import { buildBreadcrumbSchema } from '@/shared/seo/schema';

export interface Props {
  params: Promise<{ slug: string }>;
}

export const HotelNusukDetailView = async ({ params }: Props) => {
  const { slug } = await params;
  const hotel = await getHotelDetailBySlug(slug);
  if (!hotel) notFound();

  const breadcrumb = buildBreadcrumbSchema([
    { name: 'Beranda', path: '/' },
    { name: 'Hotel Nusuk', path: '/hotel-nusuk' },
    { name: hotel.label, path: `/hotel-nusuk/${slug}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <HotelDetail hotel={hotel} />
    </>
  );
};
