/**
 * Email templates for contacting umroh institutions, rendered at /template-email.
 *
 * A `body` here is not marketing copy -- it is the message a pilgrim sends to a
 * Saudi institution. Changing one changes the instructions they act on while
 * something has already gone wrong for them, so every edit needs checking
 * against the procedure it came from rather than being smoothed over.
 *
 * `body` uses `{{key}}` tokens that must match a `fields[].key`. A token with no
 * field, or a field no body uses, is caught by __tests__/content.test.ts --
 * both produce an input that changes nothing on screen.
 */

export type BodyLanguage = "id" | "en"

/** Body-language note shown on the template card. */
export const BODY_LANGUAGE_LABEL: Record<BodyLanguage, string> = {
  id: "Body dalam bahasa Indonesia",
  en: "Body dalam bahasa Inggris -- kirim apa adanya, jangan diterjemahkan",
}

export interface TemplateField {
  /** Matches a `{{key}}` token in the body. */
  key: string
  /** Used as the input label and as the `[Label]` placeholder while empty. */
  label: string
  placeholder: string
}

export interface EmailTemplate {
  id: string
  /** Institution name used as the group heading, e.g. "Nusuk Care". */
  institution: string
  title: string
  /** One sentence: when this template applies. */
  purpose: string
  to: string
  subject: string
  bodyLanguage: BodyLanguage
  body: string
  fields: TemplateField[]
  /** Files the sender has to attach themselves in their email client. */
  attachments: string[]
}

export const emailTemplates: EmailTemplate[] = [
  {
    id: "nusuk-reset-id",
    institution: "Nusuk Care",
    title: "Reset ID Nusuk yang dipakai pihak lain",
    purpose:
      "Dipakai ketika ID Nusuk Anda dikuasai pihak lain sehingga tidak bisa lagi dipakai memesan slot Raudhah.",
    to: "care@haj.gov.sa",
    subject: "Reset ID NUSUK",
    bodyLanguage: "en",
    body: `Dear Nusuk Care,

In reference to the attached screenshot, our NUSUK ID has been sabotaged by other parties.

Please kindly help to reset our ID so that we can use our ID to book Rawdah.

Your response would be highly appreciated.

Yours,
{{nama}}`,
    fields: [
      {
        key: "nama",
        label: "Nama Lengkap",
        placeholder: "Nama sesuai paspor",
      },
    ],
    attachments: [
      "Screenshot layar yang menunjukkan ID Nusuk sedang dipakai orang lain",
      "Foto atau scan visa umroh yang masih aktif",
    ],
  },
]
