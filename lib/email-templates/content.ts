/**
 * Template email untuk menghubungi support instansi umroh, dipakai /template-email.
 *
 * Isi `body` di sini bukan copy marketing -- ini kalimat yang jamaah kirim ke
 * instansi Saudi. Mengubahnya berarti mengubah instruksi yang mereka pakai saat
 * sedang bermasalah, jadi setiap perubahan perlu dicek ke sumber prosedurnya
 * dulu, bukan diperhalus begitu saja.
 *
 * `body` memakai token `{{key}}` yang harus cocok dengan salah satu `fields[].key`.
 * Token tanpa field (atau field yang tidak dipakai body) ditangkap oleh
 * __tests__/content.test.ts, karena keduanya menghasilkan isian yang tidak
 * berpengaruh apa pun di layar.
 */

export type BodyLanguage = "id" | "en"

/** Keterangan bahasa body yang ditampilkan di kartu template. */
export const BODY_LANGUAGE_LABEL: Record<BodyLanguage, string> = {
  id: "Body dalam bahasa Indonesia",
  en: "Body dalam bahasa Inggris -- kirim apa adanya, jangan diterjemahkan",
}

export interface TemplateField {
  /** Cocok dengan token `{{key}}` di body. */
  key: string
  /** Dipakai sebagai label input dan sebagai placeholder `[Label]` saat kosong. */
  label: string
  placeholder: string
}

export interface EmailTemplate {
  id: string
  /** Nama instansi yang tampil sebagai judul kelompok, mis. "Nusuk Care". */
  institution: string
  title: string
  /** Satu kalimat: kapan template ini dipakai. */
  purpose: string
  to: string
  subject: string
  bodyLanguage: BodyLanguage
  body: string
  fields: TemplateField[]
  /** Berkas yang harus dilampirkan sendiri oleh pengirim di aplikasi emailnya. */
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
