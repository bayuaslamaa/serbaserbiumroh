export const SITE_URL = 'https://www.serbaserbiumroh.id';

export const SITE_NAME = 'Serba Serbi Umroh';

export const SITE_SHORT_NAME = 'SSU';

export const SITE_DESCRIPTION =
  'Panduan lengkap umroh mandiri: estimasi biaya, direktori hotel Makkah & Madinah dengan harga per bulan, pengurusan visa, transportasi, dan cerita nyata jamaah.';

export const PROTECTED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/estimate',
  '/login',
  '/api',
  '/pricelist-hotel',
] as const;

export const absoluteUrl = (pathname: string): string => {
  if (pathname === '/') return SITE_URL;
  return `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
};
