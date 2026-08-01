/**
 * The five Serba Serbi Umroh WhatsApp groups offered after a jamaah submits
 * the community form.
 *
 * Structure lives here; invite links come from `NEXT_PUBLIC_SSU_GROUP_URL_*`.
 * Be precise about what that buys: it keeps the links out of this public
 * repository's git history, and nothing more. `NEXT_PUBLIC_*` values are
 * inlined into the client bundle at build time, so the links ARE readable in
 * the shipped JavaScript by anyone who looks — filling the form is not a gate.
 * The only real gate is "Approve new participants" on each WhatsApp group;
 * that setting, not this file, is what keeps a group tidy.
 *
 * Two consequences of build-time inlining worth remembering:
 * - Changing a link needs a rebuild, not just an env edit plus restart.
 * - Each read is written out in full below, because the inlining only
 *   recognises static `process.env.NAME` expressions, not computed keys.
 *
 * Array order is display order. The component maps over it as-is.
 */
export type SsuGroup = {
  id: string
  label: string
  url: string
  isNewest: boolean
  /**
   * Distinct members who sent a message in the last 30 days, per the snapshot
   * named in STATS_SNAPSHOT_LABEL. `undefined` means "no history yet" — never
   * write 0, which reads as a dead group.
   */
  activeMembers30d?: number
}

/**
 * One reading of WhatsApp's activity export, kept whole.
 *
 * The label and the figures live in the same literal on purpose: updating a
 * number without moving the date would leave the page certifying stale data as
 * current, and colocating them puts both edits in the same diff hunk.
 *
 * A group absent from `figures` has no reading yet — never write 0, which the
 * UI would render as a dead group rather than as missing data.
 */
const ACTIVITY_SNAPSHOT = {
  label: "31 Juli 2026",
  figures: {
    "ssu-1": 169,
    "ssu-2": 156,
    "ssu-3": 147,
    "ssu-4": 310,
  } as Record<string, number | undefined>,
}

export const SSU_GROUPS: SsuGroup[] = [
  {
    id: "ssu-5",
    label: "SSU V",
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_5 ?? "",
    isNewest: true,
  },
  {
    id: "ssu-1",
    label: "SSU I",
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_1 ?? "",
    isNewest: false,
  },
  {
    id: "ssu-2",
    label: "SSU II",
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_2 ?? "",
    isNewest: false,
  },
  {
    id: "ssu-3",
    label: "SSU III",
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_3 ?? "",
    isNewest: false,
  },
  {
    id: "ssu-4",
    label: "SSU IV",
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_4 ?? "",
    isNewest: false,
  },
  // Figures are attached from the snapshot rather than typed per entry, so a
  // group can never carry a number the snapshot's date does not cover.
].map((group) => ({ ...group, activeMembers30d: ACTIVITY_SNAPSHOT.figures[group.id] }))

/**
 * When the figures above were taken. Rendered under the group list so a stale
 * number is visible to the jamaah reading it, not just to whoever remembers to
 * update it.
 *
 * A ready-to-display string rather than a Date: the join form renders on both
 * server and client, and a locale-formatted Date would risk a hydration
 * mismatch for a value that never needs arithmetic.
 */
export const STATS_SNAPSHOT_LABEL = ACTIVITY_SNAPSHOT.label

/**
 * Whether any group can actually be joined right now.
 *
 * Trims first: an env var set to whitespace is a missing link, and treating it
 * as present would suppress the "no link yet" note the page owes the reader.
 */
export function hasAnyGroupUrl(groups: SsuGroup[]) {
  return groups.some((group) => group.url.trim().length > 0)
}
