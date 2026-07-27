"use client"

import { useEffect, useState } from "react"

type CopyPhoneButtonProps = {
  phone: string
}

export function CopyPhoneButton({ phone }: CopyPhoneButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      // Named, not a bare icon: a screen reader on a list of 25 rows otherwise
      // hears "button" 25 times with nothing to tell them apart.
      aria-label={`Salin nomor ${phone}`}
      className="text-xs underline-offset-2 hover:underline"
      style={{ color: "var(--color-text-muted)" }}
    >
      {copied ? "Tersalin" : "Salin"}
    </button>
  )
}
