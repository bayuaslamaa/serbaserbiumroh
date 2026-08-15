import type { Metadata } from 'next';
import type { ArtikelDetailProps } from '@/packages/article/presentation/view/artikel-detail.view';
import { ARTICLE_REVALIDATE_SECONDS, getArticle } from '@/packages/article/domain/articles';
import { pageMetadata } from '@/shared/seo/metadata';
import { ArtikelDetailView } from '@/packages/article/presentation/view/artikel-detail.view';

export const revalidate = ARTICLE_REVALIDATE_SECONDS;

export const generateMetadata = async ({ params }: ArtikelDetailProps): Promise<Metadata> => {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article)
    return { title: 'Artikel tidak ditemukan', robots: { index: false, follow: false } };

  const path = `/artikel/${article.slug}`;
  const description = article.seo.metaDescription || article.excerpt || '';

  const base = pageMetadata({
    title: article.seo.metaTitle || article.title,
    description,
    path,
  });

  const ogImage = article.seo.ogImageUrl || article.coverUrl;

  return {
    ...base,
    keywords: article.seo.metaKeywords.length ? article.seo.metaKeywords : undefined,
    alternates: { canonical: article.seo.canonicalUrl || path },
    robots: article.seo.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      ...base.openGraph,
      type: 'article',
      title: article.seo.ogTitle || article.seo.metaTitle || article.title,
      description: article.seo.ogDescription || description,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt,
      images: ogImage ? [{ url: ogImage, alt: article.coverAlt || article.title }] : undefined,
    },
    twitter: {
      ...base.twitter,
      title: article.seo.ogTitle || article.title,
      description: article.seo.ogDescription || description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
};

export default ArtikelDetailView;
