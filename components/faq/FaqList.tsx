"use client"

import { useMemo, useState } from "react"
import type { PublishedFaqGroup } from "@/lib/faq"
import { FaqAnswer } from "./FaqAnswer"

type FaqListProps = {
  groups: PublishedFaqGroup[]
}

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

export function FaqList({ groups }: FaqListProps) {
  const [query, setQuery] = useState("")

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) return groups

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            matchesQuery(item.question, normalizedQuery) ||
            matchesQuery(item.answer, normalizedQuery) ||
            matchesQuery(group.name, normalizedQuery)
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, query])

  return (
    <div className="space-y-8">
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <label
          htmlFor="faq-search"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-muted)" }}
        >
          Cari FAQ
        </label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari pertanyaan atau jawaban..."
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-border)",
            background: "rgba(255,255,255,0.03)",
            color: "var(--color-text)",
          }}
        />
      </div>

      {filteredGroups.length === 0 && (
        <div
          className="rounded-lg border p-8 text-center text-sm"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
        >
          Tidak ada FAQ yang cocok dengan pencarian.
        </div>
      )}

      {filteredGroups.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            {group.name}
          </h2>
          <div className="space-y-3">
            {group.items.map((item) => (
              <details
                key={item.id}
                className="rounded-lg border p-4"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                <summary className="cursor-pointer text-base font-semibold" style={{ color: "var(--color-text)" }}>
                  {item.question}
                </summary>
                <div className="mt-4">
                  <FaqAnswer answer={item.answer} />
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
