/**
 * The five Serba Serbi Umroh WhatsApp groups offered after a jamaah submits
 * the community form.
 *
 * Structure lives here; invite links do not. The links come from
 * `NEXT_PUBLIC_SSU_GROUP_URL_*` so they never enter this public repository's
 * git history — anyone who found them there could join without filling the
 * form, which is the only thing that lets an admin match a WhatsApp request to
 * a real submission.
 *
 * Client-safe: the join form is a client component, and Next.js inlines
 * `NEXT_PUBLIC_*` reads at build time. Each read is written out in full below
 * because that inlining only recognises static `process.env.NAME` expressions,
 * not computed keys.
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
    activeMembers30d: 169,
  },
  {
    id: "ssu-2",
    label: "SSU II",
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_2 ?? "",
    isNewest: false,
    activeMembers30d: 156,
  },
  {
    id: "ssu-3",
    label: "SSU III",
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_3 ?? "",
    isNewest: false,
    activeMembers30d: 147,
  },
  {
    id: "ssu-4",
    label: "SSU IV",
    url: process.env.NEXT_PUBLIC_SSU_GROUP_URL_4 ?? "",
    isNewest: false,
    activeMembers30d: 310,
  },
]

/**
 * When the activity figures above were taken. Rendered under the group list so
 * a stale number is visible to the jamaah reading it, not just to whoever
 * remembers to update it.
 *
 * A ready-to-display string rather than a Date: the join form renders on both
 * server and client, and a locale-formatted Date would risk a hydration
 * mismatch for a value that never needs arithmetic.
 */
export const STATS_SNAPSHOT_LABEL = "31 Juli 2026"

/** Whether any group can actually be joined right now. */
export function hasAnyGroupUrl(groups: SsuGroup[]) {
  return groups.some((group) => group.url.length > 0)
}
