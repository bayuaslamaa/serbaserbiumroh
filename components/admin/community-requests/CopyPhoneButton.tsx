"use client"

import { useEffect, useState } from "react"

type CopyPhoneButtonProps = {
  phone: string
}

type CopyState = "idle" | "copied" | "failed"

const LABELS: Record<CopyState, string> = {
  idle: "Salin",
  copied: "Tersalin",
  failed: "Gagal salin",
}

export function CopyPhoneButton({ phone }: CopyPhoneButtonProps) {
  const [state, setState] = useState<CopyState>("idle")

  useEffect(() => {
    if (state === "idle") return
    const timer = setTimeout(() => setState("idle"), 1500)
    return () => clearTimeout(timer)
  }, [state])

  async function copy() {
    // navigator.clipboard is undefined outside a secure context, so this has to
    // report failure rather than leave the click looking ignored.
    try {
      await navigator.clipboard.writeText(phone)
      setState("copied")
    } catch {
      setState("failed")
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      // Named, not a bare icon: a screen reader on a list of 25 rows otherwise
      // hears "button" 25 times with nothing to tell them apart.
      aria-label={`Salin nomor ${phone}`}
      aria-live="polite"
      className="text-xs underline-offset-2 hover:underline"
      style={{ color: state === "failed" ? "#ef4444" : "var(--color-text-muted)" }}
    >
      {LABELS[state]}
    </button>
  )
}
