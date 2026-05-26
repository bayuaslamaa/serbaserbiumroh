import { requireAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Calculator } from "lucide-react"
import Link from "next/link"

export const metadata = { title: "Buat Estimasi Baru" }

export default async function NewEstimatePage() {
  await requireAuth()

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
