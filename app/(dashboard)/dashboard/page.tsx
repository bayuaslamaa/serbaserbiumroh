import Link from "next/link"
import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { estimates } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { EstimateList } from "@/components/dashboard/EstimateList"
import { Button } from "@/components/ui/button"
import { FaqPreview } from "@/components/faq/FaqPreview"
import { getPublishedFaqPreview } from "@/lib/faq"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const session = await requireAuth()

  const [initialEstimates, faqItems] = await Promise.all([
    db
      .select()
      .from(estimates)
      .where(eq(estimates.userId, session.user.id))
      .orderBy(desc(estimates.createdAt))
      .limit(20),
    getPublishedFaqPreview(7),
  ])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            Estimasi Saya
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Riwayat dan rencana perjalanan umroh Anda.
          </p>
        </div>
        {session?.user?.role === "ADMIN" ? (
          <Link href="/estimate/new">
            <Button size="lg">Buat Estimasi Baru</Button>
          </Link>
        ) : (
          <Button size="lg" disabled className="opacity-50 cursor-not-allowed">
            Buat Estimasi Baru (Coming Soon)
          </Button>
        )}
      </div>

      <div className="space-y-8">
        <EstimateList initialEstimates={initialEstimates} isAdmin={session?.user?.role === "ADMIN"} />
        <FaqPreview items={faqItems} title="FAQ Umroh Mandiri" />
      </div>
    </div>
  )
}
