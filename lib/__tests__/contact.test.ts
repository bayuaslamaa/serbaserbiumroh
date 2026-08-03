import { describe, expect, it } from "vitest"

import {
  CONTACT_NUMBERS,
  SOCIAL_LINKS,
  displayPhone,
  socialHref,
  whatsappLink,
} from "../contact"
import { SSU_WHATSAPP_NUMBER } from "../services/catalog"

describe("CONTACT_NUMBERS", () => {
  it("lists both admins by name", () => {
    expect(CONTACT_NUMBERS.map((c) => c.name)).toEqual(["Nurul", "Bayu"])
  })

  it("reads Nurul's number from the services catalog rather than copying it", () => {
    // Every service CTA dials this number via whatsappHref. A second literal
    // here could drift from the one the rest of the site actually uses.
    expect(CONTACT_NUMBERS[0]?.number).toBe(SSU_WHATSAPP_NUMBER)
  })

  it("stores numbers in the digits-only international form wa.me expects", () => {
    for (const contact of CONTACT_NUMBERS) {
      expect(contact.number).toMatch(/^62\d{9,12}$/)
    }
  })

  it("carries Bayu's number, the one the transportasi picker already routes to", () => {
    expect(CONTACT_NUMBERS[1]?.number).toBe("6285172117757")
  })
})

describe("SOCIAL_LINKS", () => {
  it("covers the four accounts the site publishes", () => {
    expect(SOCIAL_LINKS.map((s) => s.short)).toEqual(["YT", "IG", "TT", "FB"])
  })

  it("points every profile at an absolute https URL", () => {
    // A relative or http href in a footer badge resolves against the site and
    // silently sends visitors to a 404 on our own domain.
    for (const social of SOCIAL_LINKS) {
      expect(social.href).toMatch(/^https:\/\//)
    }
  })

  it("gives every badge an accessible label, since the mark alone is two letters", () => {
    for (const social of SOCIAL_LINKS) {
      expect(social.label.length).toBeGreaterThan(social.short.length)
    }
  })
})

describe("socialHref", () => {
  it("resolves a profile by label", () => {
    expect(socialHref("Instagram")).toBe("https://www.instagram.com/bayuaslama_")
  })

  it("throws on an unknown label rather than returning an empty href", () => {
    // @ts-expect-error -- deliberately passing a label that does not exist
    expect(() => socialHref("Threads")).toThrow(/Unknown social profile/)
  })
})

describe("displayPhone", () => {
  it("groups the national part the way the number is read aloud", () => {
    expect(displayPhone("6285161134844")).toBe("+62 851-6113-4844")
    expect(displayPhone("6285172117757")).toBe("+62 851-7211-7757")
  })

  it("leaves an unexpected length ungrouped instead of mangling it", () => {
    expect(displayPhone("62812345")).toBe("+62 812345")
  })
})

describe("whatsappLink", () => {
  it("builds a bare chat link when there is nothing to prefill", () => {
    expect(whatsappLink("6285172117757")).toBe("https://wa.me/6285172117757")
  })

  it("encodes a prefilled message", () => {
    expect(whatsappLink("6285172117757", "Assalamualaikum, mau tanya")).toBe(
      "https://wa.me/6285172117757?text=Assalamualaikum%2C%20mau%20tanya"
    )
  })
})
