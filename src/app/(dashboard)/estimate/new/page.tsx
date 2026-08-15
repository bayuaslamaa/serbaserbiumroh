import { requireAuth } from "@/shared/auth"
import { db } from "@/shared/db"
import { fetchPricingConfig } from "@/shared/budget/calculate"
import { EstimatorClient } from "@/components/estimator/estimator-client"
import type { EstimateParams, HotelTier } from "@/shared/types"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"
import Link from "next/link"

export const metadata = { title: "Buat Estimasi Baru" }

const VALID_TIERS: HotelTier[] = ["ECONOMY", "STANDARD", "PELATARAN", "PREMIUM"]

function parseIntParam(value: string | undefined, min: number, max: number): number | undefined {
  if (value == null) return undefined
  const n = parseInt(value, 10)
  if (isNaN(n) || n < min || n > max) return undefined
  return n
}

function parseTier(value: string | undefined): HotelTier | undefined {
  if (value == null) return undefined
  const upper = value.toUpperCase() as HotelTier
  return VALID_TIERS.includes(upper) ? upper : undefined
}

interface SearchParams {
  storyName?: string
  makkahNights?: string
  madinahNights?: string
  pax?: string
  tier?: string
  travelMonth?: string
  city?: string
}

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await requireAuth()
  const isAdmin = session.user.role === "ADMIN"

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div
          className="p-8 rounded-lg border shadow-lg space-y-4"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center text-[var(--color-gold)] mx-auto">
            <Calculator className="h-8 w-8" />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight text-[var(--color-gold)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Fitur Estimasi Biaya Segera Hadir
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
            Fitur perhitungan estimasi biaya umroh mandiri berbasis kecerdasan buatan (AI) sedang dalam tahap pengembangan dan akan segera dirilis.
          </p>
          <div className="pt-2">
            <Button asChild style={{ backgroundColor: "var(--color-gold)", color: "#0b1c12" }}>
              <Link href="/dashboard">
                Kembali ke Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Admin access - load full estimator
  const pricingConfig = await fetchPricingConfig(db)

  const initialParams: Partial<EstimateParams> = {}

  const makkahNights = parseIntParam(searchParams.makkahNights, 1, 30)
  if (makkahNights != null) initialParams.nightsMakkah = makkahNights

  const madinahNights = parseIntParam(searchParams.madinahNights, 1, 30)
  if (madinahNights != null) initialParams.nightsMadinah = madinahNights

  const pax = parseIntParam(searchParams.pax, 1, 200)
  if (pax != null) initialParams.pax = pax

  const hotelTier = parseTier(searchParams.tier)
  if (hotelTier != null) initialParams.hotelTier = hotelTier

  const travelMonth = parseIntParam(searchParams.travelMonth, 1, 12)
  if (travelMonth != null) initialParams.travelMonth = travelMonth

  const hasInitialParams = Object.keys(initialParams).length > 0
  const storyName = searchParams.storyName?.trim() || undefined

  return (
    <div className="max-w-[1400px] mx-auto">
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
      <EstimatorClient
        pricingConfig={pricingConfig}
        initialParams={hasInitialParams ? initialParams : undefined}
        storySource={storyName}
        // Passed as `isAdmin` rather than a literal `true`: the gate above already guarantees it, and
        // reading the same source keeps the two from drifting apart if that gate ever loosens.
        canUseEnhancedParse={isAdmin}
      />
    </div>
  )
}
