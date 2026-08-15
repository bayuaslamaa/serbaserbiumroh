import type { Metadata } from 'next';

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './config';

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Panduan & Estimasi Biaya Umroh Mandiri`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — Panduan & Estimasi Biaya Umroh Mandiri`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Panduan & Estimasi Biaya Umroh Mandiri`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'RJgJ580cHLirhyNStiNauBjofs_kUb2RMuKmLYy1qtM',
  },
};

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
}

const BRAND_SUFFIX = /\s*\|\s*(SSU|Serba Serbi Umroh)\s*$/i;

export const stripBrandSuffix = (title: string): string => {
  return title.replace(BRAND_SUFFIX, '').trim();
};

export const pageMetadata = ({ title, description, path }: PageMetadataInput): Metadata => {
  const cleanTitle = stripBrandSuffix(title);

  return {
    title: cleanTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      locale: 'id_ID',
      siteName: SITE_NAME,
      url: path,
      title: cleanTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: cleanTitle,
      description,
    },
  };
};

export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
};

export const noIndexMetadata = (title: string): Metadata => {
  return {
    title,
    robots: { index: false, follow: false },
  };
};
