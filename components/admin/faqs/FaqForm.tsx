"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type FaqGroupOption = {
  id: string
  name: string
}

type FaqFormProps = {
  groups: FaqGroupOption[]
  initialData?: {
    id: string
    groupId: string
    question: string
    answer: string
    sortOrder: number
    isPublished: boolean
  }
}

export function FaqForm({ groups, initialData }: FaqFormProps) {
  const isEdit = !!initialData
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [groupId, setGroupId] = useState(initialData?.groupId ?? groups[0]?.id ?? "")
  const [question, setQuestion] = useState(initialData?.question ?? "")
  const [answer, setAnswer] = useState(initialData?.answer ?? "")
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder.toString() ?? "0")
  const [isPublished, setIsPublished] = useState(initialData?.isPublished ?? false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const payload = {
      groupId,
      question,
      answer,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      isPublished,
    }

    startTransition(async () => {
      try {
        const res = await fetch(isEdit ? `/api/admin/faqs/${initialData.id}` : "/api/admin/faqs", {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? "Terjadi kesalahan.")
          return
        }

        router.push("/admin/content/faqs")
        router.refresh()
      } catch {
        setError("Terjadi kesalahan jaringan.")
      }
    })
  }

  const inputClass = "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
  const inputStyle = {
    borderColor: "var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
  }
  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide"
  const labelStyle = { color: "var(--color-text-muted)" }
  const disabled = groups.length === 0 || isPending

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {error && (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          {error}
        </div>
      )}

      {groups.length === 0 && (
        <div
          className="rounded-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          Buat grup FAQ terlebih dahulu sebelum menambah pertanyaan.
        </div>
      )}

      <section
        className="space-y-4 rounded-lg border p-6"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <h2 className="text-base font-semibold" style={{ color: "var(--color-gold)" }}>
          Konten FAQ
        </h2>

        <div>
          <label className={labelClass} style={labelStyle}>
            Grup
          </label>
          <select
            className={inputClass}
            style={inputStyle}
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            disabled={disabled}
            required
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>
            Pertanyaan
          </label>
          <input
            className={inputClass}
            style={inputStyle}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={disabled}
            required
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>
            Jawaban
          </label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 220, resize: "vertical" as const }}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            disabled={disabled}
            required
            placeholder="Markdown sederhana didukung: paragraf, daftar, tebal, miring, dan link."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} style={labelStyle}>
              Urutan
            </label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              disabled={disabled}
            />
          </div>

          <label className="flex items-center gap-3 pt-6 text-sm" style={{ color: "var(--color-text)" }}>
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(event) => setIsPublished(event.target.checked)}
              disabled={disabled}
            />
            Tampilkan di publik
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-md px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: "var(--color-gold)", color: "#1a1206" }}
      >
        {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah FAQ"}
      </button>
    </form>
  )
}
