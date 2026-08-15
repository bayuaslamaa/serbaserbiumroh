import type { MetadataRoute } from 'next';

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

export interface StaticRoute {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
}

export const STATIC_ROUTES: StaticRoute[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/hotel-nusuk', changeFrequency: 'daily', priority: 0.9 },
  { path: '/panduan', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/artikel', changeFrequency: 'daily', priority: 0.9 },
  { path: '/layanan', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/visa', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/transportasi', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/cerita-jamaah', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/badalin', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/faq', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/template-email', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/komunitas', changeFrequency: 'monthly', priority: 0.6 },
];
