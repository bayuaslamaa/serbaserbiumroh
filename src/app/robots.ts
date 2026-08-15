import type { MetadataRoute } from 'next';

import { PROTECTED_PREFIXES, SITE_URL } from '@/shared/seo/config';

const robots = (): MetadataRoute.Robots => {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: PROTECTED_PREFIXES.map((prefix) => prefix),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
};

export default robots;
