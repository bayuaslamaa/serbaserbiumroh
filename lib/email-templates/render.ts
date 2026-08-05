import type { EmailTemplate } from "./content"

/**
 * Turns a template plus field values into a final body and a `mailto:` draft.
 *
 * Everything here is pure -- no React, no `window` -- so the empty-placeholder
 * behaviour, the encoding, and the length ceiling can be proven without
 * rendering a component. The calling component only displays the result.
 */

const TOKEN_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g

/**
 * The longest `mailto:` URL still safe to hand to a client.
 *
 * Browsers and mail clients truncate longer URLs without saying so, which sends
 * a half-written email. Refusing outright is the better failure.
 */
export const MAILTO_MAX_LENGTH = 1900

/**
 * The `{{key}}` tokens a template's body carries, in order of appearance.
 *
 * Exported so the data-integrity tests in content.test.ts use the same token
 * definition renderBody actually applies -- if the token syntax changes, those
 * tests change with it instead of quietly passing under the old rule.
 */
export function templateTokens(template: EmailTemplate): string[] {
  return Array.from(template.body.matchAll(TOKEN_PATTERN), (match) => match[1])
}

export interface MailtoDraft {
  href: string
  /** false once `href` exceeds MAILTO_MAX_LENGTH. */
  withinLimit: boolean
}

/**
 * Replaces each `{{key}}` with its field value.
 *
 * An empty (or whitespace-only) value becomes `[Label]` rather than an empty
 * string, so the copied text stays readable and marks what still needs editing
 * in the mail client -- the behaviour the circulated template already had.
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
 * Builds the draft URL carrying recipient, subject, and the filled-in body.
 *
 * Line breaks are normalized to CRLF before encoding: some mail clients ignore
 * a lone `%0A` and collapse every paragraph into one block.
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
