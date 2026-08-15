import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/shared/seo/og-image';

export const alt = 'Serba Serbi Umroh — Panduan & Estimasi Biaya Umroh Mandiri';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const Image = () => {
  return renderOgImage('Panduan Umroh Mandiri: Biaya, Hotel, Visa, dan Komunitas');
};

export default Image;
