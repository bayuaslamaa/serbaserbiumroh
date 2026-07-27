import { describe, expect, it } from "vitest"
import {
  formatAbsoluteDateTime,
  formatPhoneDisplay,
  formatRelativeTime,
  whatsappHref,
} from "../admin-requests-format"

const now = new Date("2026-07-27T12:00:00Z")

function ago(seconds: number) {
  return new Date(now.getTime() - seconds * 1000)
}

describe("formatRelativeTime", () => {
  it("describes recent submissions in minutes and hours", () => {
    expect(formatRelativeTime(ago(60 * 5), now)).toMatch(/menit/)
    expect(formatRelativeTime(ago(3600 * 6), now)).toMatch(/jam/)
  })

  it("steps up to days, months, and years", () => {
    expect(formatRelativeTime(ago(86_400 * 3), now)).toMatch(/hari/)
    expect(formatRelativeTime(ago(2_592_000 * 2), now)).toMatch(/bulan/)
    expect(formatRelativeTime(ago(31_536_000 * 2), now)).toMatch(/tahun/)
  })

  it("falls through to seconds for a submission that just landed", () => {
    expect(formatRelativeTime(ago(5), now)).toMatch(/detik/)
  })

  it("stays on one line, unlike the full timestamp it replaced", () => {
    expect(formatRelativeTime(ago(3600 * 6), now)).not.toMatch(/\n/)
  })
})

describe("formatAbsoluteDateTime", () => {
  it("keeps the full timestamp available for the title attribute", () => {
    const formatted = formatAbsoluteDateTime(new Date("2026-07-27T04:49:00Z"))

    expect(formatted).toMatch(/2026/)
    expect(formatted).toMatch(/Jul/)
  })
})

describe("formatPhoneDisplay", () => {
  it("groups a long number so it can be read at a glance", () => {
    expect(formatPhoneDisplay("081284051103")).toBe("0812-8405-1103")
  })

  it("leaves a number that is not plain digits exactly as typed", () => {
    expect(formatPhoneDisplay("+62 812-8405-1103")).toBe("+62 812-8405-1103")
  })

  it("leaves a short number alone", () => {
    expect(formatPhoneDisplay("0812")).toBe("0812")
  })
})

describe("whatsappHref", () => {
  it("links with the 62-prefixed normalized number, not the stored 0-prefixed one", () => {
    expect(whatsappHref("6281284051103")).toBe("https://wa.me/6281284051103")
  })
})
