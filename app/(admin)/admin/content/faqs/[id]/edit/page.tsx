import Link from "next/link"
import { notFound } from "next/navigation"
import { asc, eq } from "drizzle-orm"
import { FaqForm } from "@/components/admin/faqs/FaqForm"
import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { faqGroups, faqItems } from "@/lib/db/schema"

export const metadata = { title: "Edit FAQ" }

export default async function EditFaqPage({ params }: { params: { id: string } }) {
  await requireAdmin()

  const [groups, faqRows] = await Promise.all([
    db.select().from(faqGroups).orderBy(asc(faqGroups.sortOrder), asc(faqGroups.name)),
    db.select().from(faqItems).where(eq(faqItems.id, params.id)).limit(1),
  ])
  const faq = faqRows[0]
  if (!faq) notFound()

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link
          href="/admin/content/faqs"
          className="text-sm underline underline-offset-4"
          style={{ color: "var(--color-text-muted)" }}
        >
          Kembali ke FAQ
        </Link>
        <h1
          className="mt-3 text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Edit FAQ
        </h1>
      </div>

      <FaqForm groups={groups} initialData={faq} />
    </div>
  )
}
