import { pageMetadata } from '@/shared/seo/metadata';
import { HotelNusukView } from '@/packages/hotel/presentation/view/hotel-nusuk.view';

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: 'Hotel Nusuk: Direktori Hotel Umroh Makkah & Madinah',
  description:
    'Direktori hotel umroh di Makkah dan Madinah dengan estimasi harga per malam dalam Rupiah, jarak ke Masjidil Haram dan Masjid Nabawi, serta tautan pemesanan langsung.',
  path: '/hotel-nusuk',
});

export default HotelNusukView;
