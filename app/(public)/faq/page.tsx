import { FaqList } from "@/components/faq/FaqList"
import { getPublishedFaqGroups } from "@/lib/faq"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "FAQ Umroh Mandiri",
  description:
    "Jawaban atas pertanyaan yang paling sering ditanyakan seputar umroh mandiri: biaya, visa, hotel, dokumen, dan alur keberangkatan.",
  path: "/faq",
})

export default async function FaqPage() {
  const groups = await getPublishedFaqGroups()

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            FAQ Umroh Mandiri
          </h1>
          <p className="mt-3 text-base" style={{ color: "var(--color-text-muted)" }}>
            Pertanyaan yang sering ditanyakan tentang estimasi biaya, hotel, dokumen, dan alur umroh mandiri.
          </p>
        </div>

        {groups.length === 0 ? (
          <div
            className="rounded-lg border p-8 text-center text-sm"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            FAQ belum tersedia.
          </div>
        ) : (
          <FaqList groups={groups} />
        )}
      </div>
    </main>
  )
}
