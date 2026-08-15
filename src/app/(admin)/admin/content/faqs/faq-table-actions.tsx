"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

type FaqTableActionsProps = {
  id: string
  isPublished: boolean
}

export function FaqTableActions({ id, isPublished }: FaqTableActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function updatePublish(nextPublished: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/faqs/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: nextPublished }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? "Gagal memperbarui.")
          return
        }
        router.refresh()
      } catch {
        setError("Gagal memperbarui.")
      }
    })
  }

  function deleteFaq() {
    if (!window.confirm("Hapus FAQ ini?")) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? "Gagal menghapus.")
          return
        }
        router.refresh()
      } catch {
        setError("Gagal menghapus.")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/content/faqs/${id}/edit`}
        className="text-xs font-semibold underline underline-offset-4"
        style={{ color: "var(--color-gold)" }}
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={() => updatePublish(!isPublished)}
        disabled={isPending}
        className="text-xs font-semibold disabled:opacity-60"
        style={{ color: "var(--color-text)" }}
      >
        {isPublished ? "Unpublish" : "Publish"}
      </button>
      <button
        type="button"
        onClick={deleteFaq}
        disabled={isPending}
        className="text-xs font-semibold disabled:opacity-60"
        style={{ color: "#ef4444" }}
      >
        Hapus
      </button>
      {error && <span className="basis-full text-xs" style={{ color: "#ef4444" }}>{error}</span>}
    </div>
  )
}
