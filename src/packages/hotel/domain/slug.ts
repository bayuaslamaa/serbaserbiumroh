const FALLBACK_SLUG = 'hotel';

export const toHotelSlug = (label: string): string => {
  const slug = label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' dan ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || FALLBACK_SLUG;
};

export const nextAvailableSlug = (label: string, taken: Iterable<string>): string => {
  const used = new Set(taken);
  const base = toHotelSlug(label);

  let candidate = base;
  let suffix = 1;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
};

export interface HotelSlugInput {
  importKey: string;
  label: string;
  slug?: string | null;
}

export interface HotelSlugAssignment {
  importKey: string;
  slug: string;
}

export const assignHotelSlugs = (rows: HotelSlugInput[]): HotelSlugAssignment[] => {
  const taken = new Set<string>();
  const assigned = new Map<string, string>();

  for (const row of rows) {
    if (row.slug) {
      taken.add(row.slug);
      assigned.set(row.importKey, row.slug);
    }
  }

  const pending = rows
    .filter((row) => !row.slug)
    .sort((a, b) => (a.importKey < b.importKey ? -1 : a.importKey > b.importKey ? 1 : 0));

  for (const row of pending) {
    const base = toHotelSlug(row.label);
    let candidate = base;
    let suffix = 1;

    while (taken.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }

    taken.add(candidate);
    assigned.set(row.importKey, candidate);
  }

  return rows.map((row) => ({ importKey: row.importKey, slug: assigned.get(row.importKey)! }));
};
