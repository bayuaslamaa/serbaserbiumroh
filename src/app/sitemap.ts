import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/shared/seo/config';
import { articleRoutes, guideRoutes, hotelRoutes, storyRoutes } from '@/shared/seo/dynamic-routes';
import { STATIC_ROUTES } from '@/shared/seo/routes';

export const revalidate = 3600;

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const generatedAt = new Date();

  const [hotels, stories, articles] = await Promise.all([
    hotelRoutes(),
    storyRoutes(),
    articleRoutes(),
  ]);
  const guides = guideRoutes();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: generatedAt,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const guideEntries: MetadataRoute.Sitemap = guides.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.lastModified ?? generatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const hotelEntries: MetadataRoute.Sitemap = hotels.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.lastModified ?? generatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const storyEntries: MetadataRoute.Sitemap = stories.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.lastModified ?? generatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.lastModified ?? generatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticEntries, ...guideEntries, ...hotelEntries, ...storyEntries, ...articleEntries];
};

export default sitemap;
