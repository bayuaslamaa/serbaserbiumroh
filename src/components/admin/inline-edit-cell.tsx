"use client"

import { useState, useRef } from "react"
import { toast } from "@/shared/hooks/use-toast"

interface InlineEditCellProps {
  value: string | number
  type?: "number" | "text"
  onSave: (newValue: string | number) => Promise<void>
  formatter?: (v: string | number) => string
}

export function InlineEditCell({ value, type = "text", onSave, formatter }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commit() {
    const newValue = type === "number" ? Number(draft) : draft
    if (newValue === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(newValue)
      setEditing(false)
      toast({ title: "Tersimpan" })
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") cancel()
        }}
        disabled={saving}
        className="w-full px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
        style={{
          background: "rgba(0,0,0,0.3)",
          borderColor: "var(--color-gold-muted)",
          border: "1px solid",
          color: "var(--color-text)",
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="w-full text-left px-2 py-1 rounded text-sm hover:bg-[var(--color-surface)] transition-colors"
      style={{ color: "var(--color-text)" }}
      title="Klik untuk edit"
    >
      {formatter ? formatter(value) : value}
    </button>
  )
}
