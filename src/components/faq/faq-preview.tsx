import Link from "next/link"
import type { PublishedFaqItem } from "@/shared/faq"
import { FaqAnswer } from "./faq-answer"

type FaqPreviewProps = {
  items: PublishedFaqItem[]
  title?: string
  showViewAllLink?: boolean
}

export function FaqPreview({
  items,
  title = "FAQ",
  showViewAllLink = true,
}: FaqPreviewProps) {
  if (items.length === 0) return null

  return (
    <section
      className="rounded-lg border p-6"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            {title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            Jawaban ringkas untuk pertanyaan yang sering muncul.
          </p>
        </div>
        {showViewAllLink && (
          <Link
            href="/faq"
            className="shrink-0 text-sm font-semibold underline underline-offset-4"
            style={{ color: "var(--color-gold)" }}
          >
            Lihat semua
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.id}
            className="rounded-md border p-4"
            style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.02)" }}
          >
            <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {item.question}
              <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                {item.groupName}
              </span>
            </summary>
            <div className="mt-3">
              <FaqAnswer answer={item.answer} />
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
