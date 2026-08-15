"use client"

import { useEffect, useState } from "react"
import { Copy } from "lucide-react"

import { cn } from "@/shared/utils"

type CopyState = "idle" | "copied" | "failed"

const LABELS: Record<CopyState, string> = {
  idle: "Salin",
  copied: "Tersalin",
  failed: "Gagal salin",
}

interface CopyButtonProps {
  text: string
  /** What is being copied, e.g. "alamat tujuan". Used for the aria-label. */
  describes: string
  className?: string
}

export function CopyButton({ text, describes, className }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle")

  useEffect(() => {
    if (state === "idle") return
    const timer = setTimeout(() => setState("idle"), 1500)
    return () => clearTimeout(timer)
  }, [state])

  async function copy() {
    // navigator.clipboard is undefined outside a secure context, so failure has
    // to be visible -- a click that reports nothing is indistinguishable from a
    // broken button.
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
    } catch {
      setState("failed")
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      // One card holds three "Salin" buttons; without distinct names a screen
      // reader just hears "Salin" three times.
      aria-label={`Salin ${describes}`}
      aria-live="polite"
      className={cn(
        "inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
        state === "failed"
          ? "border-red-500/40 text-red-400"
          : "border-[rgba(201,168,76,0.3)] text-gold hover:bg-[rgba(201,168,76,0.08)]",
        className,
      )}
    >
      <Copy size={13} aria-hidden="true" />
      {LABELS[state]}
    </button>
  )
}
