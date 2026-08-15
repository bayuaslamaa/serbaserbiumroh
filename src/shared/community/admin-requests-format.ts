const relativeFormatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" })

const absoluteFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

/**
 * "6 jam lalu" instead of "27 Jul 2026, 04.49" -- the admin list is scanned for
 * recency, and the full timestamp wrapped to three lines in a narrow column.
 * The exact time stays available via the cell's title attribute.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const magnitude = Math.abs(seconds)

  for (const [unit, size] of UNITS) {
    if (magnitude >= size) return relativeFormatter.format(Math.round(seconds / size), unit)
  }

  return relativeFormatter.format(Math.round(seconds), "second")
}

export function formatAbsoluteDateTime(date: Date): string {
  return absoluteFormatter.format(date)
}

/**
 * Groups digits so a long number stays readable at a glance. Anything that is
 * not a plain digit string is left exactly as the applicant typed it.
 */
export function formatPhoneDisplay(phone: string): string {
  if (!/^\d+$/.test(phone)) return phone
  return phone.replace(/(\d{4})(?=\d)/g, "$1-")
}

/**
 * normalizedPhone is already stored in wa.me's 62-prefixed form, so it is the
 * value to link with -- the raw `phone` field may still start with 0.
 */
export function whatsappHref(normalizedPhone: string): string {
  return `https://wa.me/${normalizedPhone}`
}
