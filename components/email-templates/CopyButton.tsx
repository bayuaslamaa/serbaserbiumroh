"use client"

import { useEffect, useState } from "react"
import { Copy } from "lucide-react"

import { cn } from "@/lib/utils"

type CopyState = "idle" | "copied" | "failed"

const LABELS: Record<CopyState, string> = {
  idle: "Salin",
  copied: "Tersalin",
  failed: "Gagal salin",
}

interface CopyButtonProps {
  text: string
  /** Apa yang disalin, mis. "alamat tujuan". Dipakai untuk aria-label. */
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
    // navigator.clipboard undefined di luar secure context, jadi kegagalan harus
    // terlihat -- klik yang tidak melaporkan apa pun tidak bisa dibedakan dari
    // tombol yang rusak.
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
      // Satu kartu memuat tiga tombol "Salin"; tanpa nama yang berbeda, pembaca
      // layar cuma mendengar "Salin" tiga kali.
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
