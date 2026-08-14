import { describe, expect, it } from "vitest"

import { SITE_URL } from "@/lib/seo/config"
import nextConfig from "./next.config.mjs"

const APEX_HOST = new URL(SITE_URL).host.replace(/^www\./, "")

async function redirects() {
  return (await nextConfig.redirects?.()) ?? []
}

/** The rule that sends apex traffic to the canonical www host. */
async function apexRule() {
  return (await redirects()).find((r) =>
    r.has?.some((c) => c.type === "host" && c.value === APEX_HOST)
  )
}

describe("apex to www redirect", () => {
  it("redirects the apex host to the canonical www host", async () => {
    // Auth.js sets the PKCE cookie with no Domain attribute, so it is host-only.
    // A sign-in begun on the apex stores that cookie on serbaserbiumroh.id while
    // AUTH_URL sends Google's callback to www -- the browser then withholds the
    // cookie, @auth/core throws InvalidCheck("pkceCodeVerifier cookie was
    // missing"), and the user lands on /api/auth/error?error=Configuration.
    // Keeping every visitor on one host is what makes OAuth survivable.
    expect(await apexRule()).toBeDefined()
  })

  it("issues a permanent 308 so link equity moves to the canonical host", async () => {
    // A 307 would leave the apex indexable and split the canonical signal that
    // lib/seo/config.ts declares -- the SEO plan's KTD1 calls for 308.
    expect((await apexRule())?.permanent).toBe(true)
  })

  it("preserves the path so a deep link is not dumped on the homepage", async () => {
    const rule = await apexRule()

    expect(rule?.source).toBe("/:path*")
    expect(rule?.destination).toBe(`${SITE_URL}/:path*`)
  })

  it("does not redirect the canonical host itself", async () => {
    // A rule matching www as well as the apex would redirect www to www
    // forever. Nothing in the list may key on the canonical host.
    const wwwHost = new URL(SITE_URL).host

    for (const rule of await redirects()) {
      const matchesWww = rule.has?.some((c) => c.type === "host" && c.value === wwwHost)
      expect(matchesWww ?? false, `${rule.source} must not match ${wwwHost}`).toBe(false)
    }
  })

  it("still redirects /hotel to the Nusuk directory", async () => {
    // Guards the pre-existing rule against being dropped while editing the list.
    const hotel = (await redirects()).find((r) => r.source === "/hotel")

    expect(hotel?.destination).toBe("/hotel-nusuk")
    expect(hotel?.permanent).toBe(true)
  })
})
