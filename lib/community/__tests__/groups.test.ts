import { describe, expect, it } from "vitest"
import { SSU_GROUPS, STATS_SNAPSHOT_LABEL, hasAnyGroupUrl } from "../groups"

describe("SSU_GROUPS", () => {
  it("lists all five groups", () => {
    expect(SSU_GROUPS).toHaveLength(5)
  })

  it("gives every group a unique id and a label", () => {
    const ids = SSU_GROUPS.map((group) => group.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const group of SSU_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0)
    }
  })

  it("puts the one newest group first", () => {
    // The array is the display order — the component maps over it as-is, so
    // ordering lives here rather than in a sort at render time.
    const newest = SSU_GROUPS.filter((group) => group.isNewest)

    expect(newest).toHaveLength(1)
    expect(SSU_GROUPS[0].isNewest).toBe(true)
  })

  it("orders the older groups by roman numeral after the newest one", () => {
    expect(SSU_GROUPS.slice(1).map((group) => group.label)).toEqual([
      "SSU I",
      "SSU II",
      "SSU III",
      "SSU IV",
    ])
  })

  it("keeps every activity figure a positive whole number", () => {
    // Zero would render as "0 member aktif", which reads as a dead group
    // rather than as missing data. Absent is spelled `undefined`, not 0.
    for (const group of SSU_GROUPS) {
      if (group.activeMembers30d === undefined) continue

      expect(Number.isInteger(group.activeMembers30d)).toBe(true)
      expect(group.activeMembers30d).toBeGreaterThan(0)
    }
  })

  it("leaves the newest group without an activity figure", () => {
    // A brand-new group has no 30-day history to report yet. Revisit this
    // once SSU V accumulates one — the figure is legitimate then.
    expect(SSU_GROUPS[0].activeMembers30d).toBeUndefined()
  })

  it("labels the activity snapshot so a stale figure is visible", () => {
    expect(STATS_SNAPSHOT_LABEL.length).toBeGreaterThan(0)
  })
})

describe("hasAnyGroupUrl", () => {
  it("is true when at least one group has an invite link", () => {
    expect(
      hasAnyGroupUrl([
        { id: "a", label: "A", url: "", isNewest: false },
        { id: "b", label: "B", url: "https://chat.whatsapp.com/b", isNewest: false },
      ])
    ).toBe(true)
  })

  it("is false when every invite link is missing", () => {
    expect(
      hasAnyGroupUrl([
        { id: "a", label: "A", url: "", isNewest: false },
        { id: "b", label: "B", url: "", isNewest: false },
      ])
    ).toBe(false)
  })

  it("is false for an empty list", () => {
    expect(hasAnyGroupUrl([])).toBe(false)
  })
})
