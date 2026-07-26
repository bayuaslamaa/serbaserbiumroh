import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { JsonLd } from "../JsonLd"
import type { JsonLdObject } from "@/lib/seo/schema"

function scriptContent(data: JsonLdObject) {
  const { container } = render(<JsonLd data={data} />)
  return container.querySelector('script[type="application/ld+json"]')?.innerHTML ?? ""
}

describe("JsonLd", () => {
  it("renders a single application/ld+json script", () => {
    const { container } = render(
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite" }} />,
    )

    expect(container.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1)
  })

  it("emits parseable JSON", () => {
    const html = scriptContent({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Serba Serbi Umroh",
    })

    expect(JSON.parse(html)).toMatchObject({ "@type": "Organization", name: "Serba Serbi Umroh" })
  })

  it("escapes a closing script tag hidden in database content", () => {
    // A hotel name or FAQ answer containing this would otherwise end the
    // script block early and inject the rest of the string as markup.
    const html = scriptContent({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Hotel </script><img src=x onerror=alert(1)>",
    })

    expect(html).not.toContain("</script>")
    expect(html).not.toContain("<img")
    expect(JSON.parse(html).name).toBe("Hotel </script><img src=x onerror=alert(1)>")
  })

  it("escapes bare angle brackets and ampersands while preserving the value", () => {
    const html = scriptContent({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Makkah & Madinah <hotel>",
    })

    expect(html).not.toContain("<")
    expect(html).not.toContain(">")
    expect(html).not.toContain("&")
    expect(JSON.parse(html).name).toBe("Makkah & Madinah <hotel>")
  })
})
