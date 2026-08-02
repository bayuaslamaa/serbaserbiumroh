import { describe, expect, it } from "vitest"

import {
  WEBINAR_ACCESS_NOTE,
  WEBINAR_DATE_LABEL,
  WEBINAR_STARTS_AT,
  WEBINAR_TIME_LABEL,
} from "../webinar"

const TIME_ZONE = "Asia/Jakarta"

function jakartaPart(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: TIME_ZONE, ...options }).format(
    WEBINAR_STARTS_AT
  )
}

/**
 * The two visible labels and the machine-readable timestamp are independent
 * literals, and nothing in the module relates them. These assertions are the only
 * thing that relates them: edit the event date and forget a label, and the
 * webinar page advertises one day while the timestamp says another -- the exact
 * drift lib/webinar.ts exists to end, reintroduced one level up.
 *
 * These assertions are containment checks, not equality: the labels are campaign
 * copy ("Ahad, 2 Agustus 2026", "13.00 WIB"), deliberately not formatter output.
 * They only pin the facts a formatter can derive.
 */
describe("webinar labels agree with WEBINAR_STARTS_AT", () => {
  it("names the weekday the timestamp actually falls on", () => {
    const weekday = jakartaPart({ weekday: "long" })

    // id-ID renders Sunday as "Minggu"; the campaign writes it "Ahad". Both name
    // the same day, so either spelling satisfies this -- but only for the day the
    // timestamp really is.
    const accepted = weekday === "Minggu" ? ["Minggu", "Ahad"] : [weekday]

    expect(
      accepted.some((name) => WEBINAR_DATE_LABEL.includes(name)),
      `${WEBINAR_DATE_LABEL} does not name ${weekday}, the ${TIME_ZONE} weekday of ${WEBINAR_STARTS_AT.toISOString()}`
    ).toBe(true)
  })

  it("states the same day, month, and year as the timestamp", () => {
    expect(WEBINAR_DATE_LABEL).toContain(jakartaPart({ day: "numeric" }))
    expect(WEBINAR_DATE_LABEL).toContain(jakartaPart({ month: "long" }))
    expect(WEBINAR_DATE_LABEL).toContain(jakartaPart({ year: "numeric" }))
  })

  it("states the same start hour as the timestamp, in WIB", () => {
    const hour = jakartaPart({ hour: "2-digit", hour12: false })
    const minute = jakartaPart({ minute: "2-digit" }).padStart(2, "0")

    // "09.00 WIB" -- Indonesian writes the separator as a dot.
    expect(WEBINAR_TIME_LABEL).toContain(`${hour}.${minute}`)
    // WEBINAR_STARTS_AT is anchored to +07:00, so the label must not claim
    // another zone.
    expect(WEBINAR_TIME_LABEL).toContain("WIB")
  })

  it("anchors the timestamp to Jakarta time, so the labels have a fixed meaning", () => {
    expect(WEBINAR_STARTS_AT.toISOString()).toBe("2026-08-02T06:00:00.000Z")
  })
})

describe("derived webinar copy", () => {
  it("states the RSVP access rule the webinar page renders", () => {
    expect(WEBINAR_ACCESS_NOTE).toBe("Khusus user yang sudah login")
  })
})
