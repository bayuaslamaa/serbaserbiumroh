import { Mail } from "lucide-react"

import { EmailTemplateCard } from "@/components/email-templates/email-template-card"
import { emailTemplates, type EmailTemplate } from "@/shared/email-templates/content"
import { pageMetadata } from "@/shared/seo/metadata"

export const metadata = pageMetadata({
  title: "Template Email ke Instansi Umroh",
  description:
    "Kumpulan template email siap pakai untuk menghubungi support instansi umroh, termasuk permintaan reset ID Nusuk ke Nusuk Care.",
  path: "/template-email",
})

/**
 * Groups templates by institution, keeping first-appearance order so the order
 * in lib/email-templates/content.ts decides what shows first -- not an
 * alphabetical sort that carries no meaning.
 */
function groupByInstitution(templates: EmailTemplate[]) {
  const groups = new Map<string, EmailTemplate[]>()

  for (const template of templates) {
    const existing = groups.get(template.institution)
    if (existing) existing.push(template)
    else groups.set(template.institution, [template])
  }

  return Array.from(groups, ([institution, items]) => ({ institution, items }))
}

export default function TemplateEmailPage() {
  const groups = groupByInstitution(emailTemplates)

  return (
    <div className="mx-auto max-w-4xl px-2 pb-20">
      <section className="pb-8 pt-10 md:pt-14">
        <div
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-[11px] font-bold tracking-[0.12em] text-gold"
          style={{
            background: "rgba(201,168,76,0.08)",
            borderColor: "rgba(201,168,76,0.25)",
          }}
        >
          <Mail size={13} aria-hidden="true" />
          TEMPLATE EMAIL
        </div>
        <h1
          className="text-3xl font-bold leading-[1.15] text-text md:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Template Email ke Instansi Umroh
        </h1>
        <p className="mt-3 max-w-[620px] text-[15px] leading-[1.7] text-text-muted">
          Sebagian urusan umroh mandiri harus diselesaikan lewat email ke instansi di Saudi, dan
          isinya harus tepat. Isi nama Anda di template yang sesuai, lalu salin atau langsung buka
          sebagai draft di aplikasi email Anda.
        </p>
        <p className="mt-3 max-w-[620px] text-[13.5px] leading-[1.7] text-text-muted">
          Emailnya dikirim dari alamat Anda sendiri, bukan dari kami -- supaya balasan instansi
          masuk ke inbox Anda langsung.
        </p>
      </section>

      <div className="flex flex-col gap-10">
        {groups.map((group) => (
          <section key={group.institution}>
            <h2
              className="mb-4 text-xl font-bold text-text md:text-2xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {group.institution}
            </h2>
            <div className="flex flex-col gap-5">
              {group.items.map((template) => (
                <EmailTemplateCard key={template.id} template={template} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
