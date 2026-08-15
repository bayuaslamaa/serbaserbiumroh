import Link from 'next/link';
import { notFound } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { ARTICLE_REVALIDATE_SECONDS, getArticle } from '@/packages/article/domain/articles';
import { absoluteUrl } from '@/shared/seo/config';

export type ArtikelDetailProps = { params: Promise<{ slug: string }> };

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const ArtikelDetailView = async ({ params }: ArtikelDetailProps) => {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const jsonLd = article.seo.structuredData ?? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seo.metaDescription || article.excerpt || undefined,
    image: article.seo.ogImageUrl || article.coverUrl || undefined,
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt,
    author: article.authorName ? { '@type': 'Person', name: article.authorName } : undefined,
    mainEntityOfPage: absoluteUrl(`/artikel/${article.slug}`),
  };

  return (
    <article className="max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/artikel" className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        ← Semua artikel
      </Link>

      <h1
        className="text-3xl font-bold mt-4 mb-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        {article.title}
      </h1>

      <p className="text-xs mb-8" style={{ color: 'var(--color-text-muted)' }}>
        {[
          article.authorName,
          article.category?.name,
          article.publishedAt ? dateFormatter.format(new Date(article.publishedAt)) : null,
          article.readingMinutes ? `${article.readingMinutes} menit baca` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>

      <div
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
      />

      {article.tags.length > 0 && (
        <p className="text-xs mt-10" style={{ color: 'var(--color-text-muted)' }}>
          Tag: {article.tags.map((tag) => tag.name).join(', ')}
        </p>
      )}
    </article>
  );
};
