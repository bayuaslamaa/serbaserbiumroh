import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from './config';

export interface JsonLdObject {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

const WHATSAPP_NUMBER = '+6285161134844';

export const buildOrganizationSchema = (): JsonLdObject => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: 'SSU',
    url: SITE_URL,
    logo: absoluteUrl('/logo.png'),
    description: SITE_DESCRIPTION,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: WHATSAPP_NUMBER,
      availableLanguage: ['id'],
    },
  };
};

export const buildWebSiteSchema = (): JsonLdObject => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'id-ID',
  };
};

export interface FaqEntry {
  question: string;
  answer: string;
}

export const buildFaqPageSchema = (entries: FaqEntry[]): JsonLdObject | null => {
  const usable = entries.filter((entry) => entry.question.trim() && entry.answer.trim());
  if (usable.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: usable.map((entry) => ({
      '@type': 'Question',
      name: entry.question.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer.trim(),
      },
    })),
  };
};

export interface ArticleInput {
  headline: string;
  description: string;
  path: string;
  authorName: string;
  datePublished: Date;
  dateModified: Date;
}

export const buildArticleSchema = (input: ArticleInput): JsonLdObject => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: absoluteUrl(input.path),
    author: { '@type': 'Person', name: input.authorName },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.png') },
    },
    datePublished: input.datePublished.toISOString(),
    dateModified: input.dateModified.toISOString(),
    inLanguage: 'id-ID',
  };
};

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export const buildBreadcrumbSchema = (items: BreadcrumbItem[]): JsonLdObject => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
};
