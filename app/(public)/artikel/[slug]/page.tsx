import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import DOMPurify from "isomorphic-dompurify"

import { ARTICLE_REVALIDATE_SECONDS, getArticle } from "@/lib/articles"
import { absoluteUrl } from "@/lib/seo/config"
import { pageMetadata } from "@/lib/seo/metadata"

export const revalidate = ARTICLE_REVALIDATE_SECONDS

type ArtikelDetailProps = { params: Promise<{ slug: string }> }

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export async function generateMetadata({ params }: ArtikelDetailProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) return { title: "Artikel tidak ditemukan", robots: { index: false, follow: false } }

  const path = `/artikel/${article.slug}`
  const description = article.seo.metaDescription || article.excerpt || ""

  const base = pageMetadata({
    title: article.seo.metaTitle || article.title,
    description,
    path,
  })

  const ogImage = article.seo.ogImageUrl || article.coverUrl

  return {
    ...base,
    keywords: article.seo.metaKeywords.length ? article.seo.metaKeywords : undefined,
    alternates: { canonical: article.seo.canonicalUrl || path },
    robots: article.seo.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      ...base.openGraph,
      type: "article",
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
  }
}

export default async function ArtikelDetailPage({ params }: ArtikelDetailProps) {
  const { slug } = await params
  const article = await getArticle(slug)

  if (!article) notFound()

  const jsonLd = article.seo.structuredData ?? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seo.metaDescription || article.excerpt || undefined,
    image: article.seo.ogImageUrl || article.coverUrl || undefined,
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt,
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    mainEntityOfPage: absoluteUrl(`/artikel/${article.slug}`),
  }

  return (
    <article className="max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/artikel" className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        ← Semua artikel
      </Link>

      <h1
        className="text-3xl font-bold mt-4 mb-2"
        style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
      >
        {article.title}
      </h1>

      <p className="text-xs mb-8" style={{ color: "var(--color-text-muted)" }}>
        {[
          article.authorName,
          article.category?.name,
          article.publishedAt ? dateFormatter.format(new Date(article.publishedAt)) : null,
          article.readingMinutes ? `${article.readingMinutes} menit baca` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div
        className="prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
      />

      {article.tags.length > 0 && (
        <p className="text-xs mt-10" style={{ color: "var(--color-text-muted)" }}>
          Tag: {article.tags.map((tag) => tag.name).join(", ")}
        </p>
      )}
    </article>
  )
}
