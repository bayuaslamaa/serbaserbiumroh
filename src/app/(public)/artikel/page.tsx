import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ARTICLE_REVALIDATE_SECONDS, getArticles } from "@/shared/articles"
import { pageMetadata } from "@/shared/seo/metadata"

export const revalidate = ARTICLE_REVALIDATE_SECONDS

export const metadata = pageMetadata({
  title: "Artikel Umroh Mandiri",
  description:
    "Kumpulan artikel seputar umroh mandiri — persiapan, visa, hotel, transportasi, dan pengalaman jamaah.",
  path: "/artikel",
})

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

export default async function ArtikelPage() {
  const { items } = await getArticles({ limit: 30 })

  return (
    <div className="max-w-4xl mx-auto">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
      >
        Artikel
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        Tulisan terbaru seputar umroh mandiri
      </p>

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Belum ada artikel yang terbit.
        </p>
      ) : (
        <div className="grid gap-3">
          {items.map((article) => (
            <Link key={article.id} href={`/artikel/${article.slug}`}>
              <Card
                className="hover:border-yellow-600 transition-colors cursor-pointer"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "var(--color-border)",
                }}
              >
                <CardHeader className="pb-1 pt-4">
                  <CardTitle className="text-base" style={{ color: "var(--color-gold)" }}>
                    {article.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  {article.excerpt && (
                    <p className="text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>
                      {article.excerpt}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {[
                      article.category?.name,
                      article.publishedAt
                        ? dateFormatter.format(new Date(article.publishedAt))
                        : null,
                      article.readingMinutes ? `${article.readingMinutes} menit baca` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
