import { describe, expect, it } from "vitest"

import { PROTECTED_PREFIXES, SITE_URL } from "@/lib/seo/config"
import robots from "../robots"

describe("robots.txt", () => {
  it("allows all user agents to crawl the site", () => {
    const rules = robots().rules
    const rule = Array.isArray(rules) ? rules[0] : rules

    expect(rule.userAgent).toBe("*")
    expect(rule.allow).toBe("/")
  })

  it("disallows every protected prefix", () => {
    const rules = robots().rules
    const rule = Array.isArray(rules) ? rules[0] : rules
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]

    for (const prefix of PROTECTED_PREFIXES) {
      expect(disallow, `${prefix} must be disallowed`).toContain(prefix)
    }
  })

  it("blocks the bare protected paths, not only what sits under them", () => {
    // "Disallow: /login/" matches /login/anything but not /login, and /login
    // is the actual page. The trailing slash would have left it crawlable.
    const rules = robots().rules
    const rule = Array.isArray(rules) ? rules[0] : rules
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow]

    for (const entry of disallow) {
      expect(entry!.endsWith("/"), `${entry} should not end in a slash`).toBe(false)
    }
  })

  it("points at the sitemap with an absolute URL on the canonical host", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })

  it("declares the canonical host so crawlers prefer www", () => {
    expect(robots().host).toBe(SITE_URL)
  })
})
