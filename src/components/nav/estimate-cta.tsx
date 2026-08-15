import Link from "next/link"
import { PlusCircle } from "lucide-react"

type Variant = "desktop" | "mobileBar" | "mobileFooter"

const shape: Record<
  Variant,
  { base: string; iconSize: number | null; showComingSoon: boolean }
> = {
  desktop: {
    base: "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-[13px] font-bold",
    iconSize: 15,
    showComingSoon: true,
  },
  mobileBar: {
    base: "flex items-center whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold",
    iconSize: null,
    showComingSoon: false,
  },
  mobileFooter: {
    base: "flex w-full items-center justify-center gap-2 rounded-[10px] py-3.5 text-[15px] font-bold",
    iconSize: 17,
    showComingSoon: true,
  },
}

/**
 * The "Buat Estimasi" call to action. The estimator is admin-only, so the
 * gate lives here rather than at each of the three call sites.
 */
export function EstimateCta({
  variant,
  isAdmin,
  onNavigate,
}: {
  variant: Variant
  isAdmin: boolean
  onNavigate?: () => void
}) {
  const { base, iconSize, showComingSoon } = shape[variant]
  const icon = iconSize ? <PlusCircle size={iconSize} /> : null

  if (isAdmin) {
    return (
      <Link
        href="/estimate/new"
        onClick={onNavigate}
        className={`${base} bg-gold text-bg transition-colors hover:bg-gold-hover`}
      >
        {icon}
        Buat Estimasi
      </Link>
    )
  }

  return (
    <button
      type="button"
      disabled
      className={`${base} cursor-not-allowed border font-semibold text-text-muted opacity-60`}
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {icon}
      {showComingSoon ? "Buat Estimasi (Coming Soon)" : "Buat Estimasi"}
    </button>
  )
}
