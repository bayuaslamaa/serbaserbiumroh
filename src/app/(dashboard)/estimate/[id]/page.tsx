import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireAuth } from "@/shared/auth"
import { db } from "@/shared/db"
import { estimates } from "@/shared/db/schema"
import { fetchPricingConfig } from "@/shared/budget/calculate"
import { EstimatorClient } from "@/components/estimator/estimator-client"
import { eq } from "drizzle-orm"
import type { EstimateParams, ManualOverrides } from "@/shared/types"

export const metadata = { title: "Edit Estimasi" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EstimateDetailPage({ params }: Props) {
  const { id } = await params
  const session = await requireAuth()

  const [estimate] = await db.select().from(estimates).where(eq(estimates.id, id))
  if (!estimate) notFound()

  if (estimate.userId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const pricingConfig = await fetchPricingConfig(db)

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>
          <Link href="/dashboard" className="hover:text-[var(--color-text)] transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <span>{estimate.title ?? "Estimasi"}</span>
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          {estimate.title ?? "Edit Estimasi"}
        </h1>
      </div>

      <EstimatorClient
        pricingConfig={pricingConfig}
        estimateId={estimate.id}
        existingParams={estimate.params as EstimateParams}
        existingOverrides={(estimate.manualOverrides as ManualOverrides | null) ?? undefined}
        existingRawInput={estimate.rawInput}
        existingAiNotes={estimate.aiNotes ?? undefined}
        existingTitle={estimate.title}
        savedAt={estimate.updatedAt.toISOString()}
        canEditOverrides={session.user.role === "ADMIN"}
        // Unlike /estimate/new this page is reachable by the non-admin who owns the estimate, and
        // "Tulis ulang dari nol" reopens the parse panel here — so the toggle needs its own check.
        canUseEnhancedParse={session.user.role === "ADMIN"}
      />
    </div>
  )
}
