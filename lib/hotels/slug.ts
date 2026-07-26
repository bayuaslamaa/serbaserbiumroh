/**
 * URL slugs for hotel detail pages.
 *
 * The slug is stored as a column rather than derived at request time on
 * purpose: deriving it from the label would silently move an indexed URL the
 * moment an admin edits a hotel name. Once a row has a slug, nothing here
 * ever changes it.
 */

const FALLBACK_SLUG = "hotel"

export function toHotelSlug(label: string): string {
  const slug = label
    .normalize("NFKD")
    // Strip the combining marks left behind by NFKD, so "ô" becomes "o".
    .replace(/[̀-ͯ]/g, "")
    // Hotel names routinely join two properties with "&"; spelling it out
    // keeps them from running together into one word.
    .replace(/&/g, " dan ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || FALLBACK_SLUG
}

/**
 * Picks a free slug for one new hotel, given the slugs already in use.
 *
 * Used on the admin create path, where assignHotelSlugs' batch view is not
 * available -- only the new row and the existing set.
 */
export function nextAvailableSlug(label: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  const base = toHotelSlug(label)

  let candidate = base
  let suffix = 1
  while (used.has(candidate)) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }

  return candidate
}

export interface HotelSlugInput {
  importKey: string
  label: string
  /** Already-assigned slug. Present rows keep it, whatever the label now says. */
  slug?: string | null
}

export interface HotelSlugAssignment {
  importKey: string
  slug: string
}

/**
 * Assigns a slug to every row, preserving any that already has one.
 *
 * Collisions are resolved by importKey order rather than input order, so the
 * backfill produces the same result no matter how the rows come back from the
 * database -- re-running it can never shuffle which hotel owns the bare slug.
 */
export function assignHotelSlugs(rows: HotelSlugInput[]): HotelSlugAssignment[] {
  const taken = new Set<string>()
  const assigned = new Map<string, string>()

  for (const row of rows) {
    if (row.slug) {
      taken.add(row.slug)
      assigned.set(row.importKey, row.slug)
    }
  }

  const pending = rows
    .filter((row) => !row.slug)
    .sort((a, b) => a.importKey.localeCompare(b.importKey))

  for (const row of pending) {
    const base = toHotelSlug(row.label)
    let candidate = base
    let suffix = 1

    while (taken.has(candidate)) {
      suffix += 1
      candidate = `${base}-${suffix}`
    }

    taken.add(candidate)
    assigned.set(row.importKey, candidate)
  }

  return rows.map((row) => ({ importKey: row.importKey, slug: assigned.get(row.importKey)! }))
}
