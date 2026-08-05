import type { EmailTemplate } from "./content"

/**
 * Menyusun body email dan draft `mailto:` dari sebuah template.
 *
 * Semua di sini fungsi murni tanpa React atau akses `window`, supaya perilaku
 * placeholder-kosong, encoding, dan ambang panjang bisa diuji tanpa merender
 * komponen. Komponen yang memanggilnya cuma menampilkan hasilnya.
 */

const TOKEN_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g

/**
 * Batas panjang URL `mailto:` yang masih aman.
 *
 * Browser dan klien email memotong URL yang lebih panjang tanpa memberi tahu,
 * jadi drafnya terkirim dalam keadaan terpotong. Menolak secara eksplisit lebih
 * baik daripada membiarkan jamaah mengirim email setengah jadi.
 */
export const MAILTO_MAX_LENGTH = 1900

export interface MailtoDraft {
  href: string
  /** false ketika `href` melewati MAILTO_MAX_LENGTH. */
  withinLimit: boolean
}

/**
 * Mengganti tiap `{{key}}` dengan nilai isian.
 *
 * Isian yang kosong (atau spasi saja) jadi `[Label]`, bukan string kosong --
 * hasil salinannya tetap terbaca dan jelas menandai bagian yang perlu diedit
 * sendiri di aplikasi email, persis seperti template yang beredar di komunitas.
 */
export function renderBody(
  template: EmailTemplate,
  values: Record<string, string>,
): string {
  const fields = new Map(template.fields.map((field) => [field.key, field]))

  return template.body.replace(TOKEN_PATTERN, (token, key: string) => {
    const field = fields.get(key)
    if (!field) return token

    const value = (values[key] ?? "").trim()
    return value === "" ? `[${field.label}]` : value
  })
}

/**
 * Menyusun URL draft email berisi tujuan, subject, dan body hasil isian.
 *
 * Pemisah baris dinormalkan ke CRLF sebelum di-encode: sebagian klien email
 * mengabaikan `%0A` tunggal dan menggabungkan seluruh paragraf jadi satu blok.
 */
export function buildMailtoHref(
  template: EmailTemplate,
  values: Record<string, string>,
): MailtoDraft {
  const body = renderBody(template, values).replace(/\r\n|\r|\n/g, "\r\n")

  const query = [
    `subject=${encodeURIComponent(template.subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join("&")

  const href = `mailto:${template.to}?${query}`

  return { href, withinLimit: href.length <= MAILTO_MAX_LENGTH }
}
