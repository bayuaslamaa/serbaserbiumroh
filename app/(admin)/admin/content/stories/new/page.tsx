import { requireAdmin } from "@/lib/auth"
import Link from "next/link"
import { StoryForm } from "@/components/admin/stories/StoryForm"

export const metadata = { title: "Admin — Buat Cerita Baru" }

export default async function NewStoryPage() {
  await requireAdmin()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/content/stories"
          className="text-sm mb-3 inline-block hover:opacity-80"
          style={{ color: "var(--color-text-muted)" }}
        >
          ← Kembali ke daftar
        </Link>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Buat Cerita Baru
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Tambahkan cerita perjalanan umroh jamaah.
        </p>
      </div>

      <StoryForm />
    </div>
  )
}
