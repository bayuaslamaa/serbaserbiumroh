import Link from "next/link"
import { asc } from "drizzle-orm"
import { FaqForm } from "@/components/admin/faqs/FaqForm"
import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { faqGroups } from "@/lib/db/schema"

export const metadata = { title: "Tambah FAQ" }

export default async function NewFaqPage() {
  await requireAdmin()

  const groups = await db
    .select()
    .from(faqGroups)
    .orderBy(asc(faqGroups.sortOrder), asc(faqGroups.name))

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
          Tambah FAQ
        </h1>
      </div>

      <FaqForm groups={groups} />
    </div>
  )
}
