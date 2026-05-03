import { requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"
import { fetchPricingConfig } from "@/lib/budget/calculate"
import { EstimatorClient } from "@/components/estimator/EstimatorClient"

export const metadata = { title: "Buat Estimasi Baru" }

export default async function NewEstimatePage() {
  await requireAuth()
  const pricingConfig = await fetchPricingConfig(db)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Estimasi Biaya Umroh
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Deskripsikan rencana perjalanan Anda, atau atur parameter secara manual.
        </p>
      </div>
      <EstimatorClient pricingConfig={pricingConfig} />
    </div>
  )
}
