"use client"

import { useMemo, useState } from "react"
import { Languages, Mail, Paperclip } from "lucide-react"

import { CopyButton } from "@/components/email-templates/CopyButton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BODY_LANGUAGE_LABEL, type EmailTemplate } from "@/lib/email-templates/content"
import { buildMailtoHref, renderBody } from "@/lib/email-templates/render"

interface EmailTemplateCardProps {
  template: EmailTemplate
}

interface MetaRowProps {
  label: string
  value: string
  /** What is being copied, e.g. "alamat tujuan". Used for the aria-label. */
  describes: string
}

function MetaRow({ label, value, describes }: MetaRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3.5 py-2.5">
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
          {label}
        </dt>
        <dd className="break-words text-sm font-semibold text-text">{value}</dd>
      </div>
      <CopyButton text={value} describes={describes} />
    </div>
  )
}

export function EmailTemplateCard({ template }: EmailTemplateCardProps) {
  const [values, setValues] = useState<Record<string, string>>({})

  const body = useMemo(() => renderBody(template, values), [template, values])
  const draft = useMemo(() => buildMailtoHref(template, values), [template, values])

  return (
    <article
      className="rounded-2xl border p-5 md:p-6"
      style={{
        borderColor: "rgba(201,168,76,0.18)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <h3
        className="text-lg font-bold text-text md:text-xl"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {template.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{template.purpose}</p>

      <dl className="mt-5 flex flex-col gap-2.5">
        <MetaRow label="Kirim ke" value={template.to} describes="alamat tujuan" />
        <MetaRow label="Subject" value={template.subject} describes="subject email" />
      </dl>

      {template.fields.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {template.fields.map((field) => (
            <div key={field.key}>
              <Label htmlFor={`${template.id}-${field.key}`}>{field.label}</Label>
              <Input
                id={`${template.id}-${field.key}`}
                className="mt-1.5"
                value={values[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {/* min-w-0 on both: without it the note is an unshrinkable flex item
              and its one long line overflows the card on a phone. */}
          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-text-muted">
            <Languages size={14} className="flex-shrink-0" aria-hidden="true" />
            <span className="min-w-0">{BODY_LANGUAGE_LABEL[template.bodyLanguage]}</span>
          </span>
          <CopyButton text={body} describes="body email" />
        </div>
        {/* whitespace-pre-line rather than injected <br>: part of this body comes
            from user input, so no HTML is assembled here. */}
        <div className="max-h-80 overflow-y-auto whitespace-pre-line break-words rounded-xl border border-[var(--color-border)] bg-[rgba(0,0,0,0.15)] px-3.5 py-3 text-[13.5px] leading-[1.7] text-text">
          {body}
        </div>
      </div>

      <div className="mt-4">
        {draft.withinLimit ? (
          <a
            href={draft.href}
            className="inline-flex items-center gap-2 rounded-[10px] bg-gold px-5 py-2.5 text-sm font-bold text-bg transition-colors hover:bg-gold-hover"
          >
            <Mail size={16} aria-hidden="true" />
            Buka di aplikasi email
          </a>
        ) : (
          <div>
            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] border border-[var(--color-border)] px-5 py-2.5 text-sm font-bold text-text-muted opacity-60"
            >
              <Mail size={16} aria-hidden="true" />
              Buka di aplikasi email
            </button>
            <p className="mt-1.5 text-[12.5px] text-text-muted">
              Body template ini terlalu panjang untuk dibuka sebagai draft otomatis. Pakai tombol
              Salin di atas, lalu tempel sendiri di aplikasi email Anda.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-[var(--color-border)] px-3.5 py-3">
        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-text">
          <Paperclip size={14} aria-hidden="true" />
          Lampiran yang harus disiapkan
        </div>
        <ul className="mt-2 flex flex-col gap-1.5">
          {template.attachments.map((attachment) => (
            <li key={attachment} className="flex gap-2 text-[13px] leading-relaxed text-text-muted">
              <span aria-hidden="true" className="text-gold">
                &bull;
              </span>
              {attachment}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-text-muted">
          Lampiran tidak ikut terbawa dari halaman ini -- tambahkan sendiri di aplikasi email
          sebelum mengirim.
        </p>
      </div>
    </article>
  )
}
