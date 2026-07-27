import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/nav/NavBar", () => ({ NavBar: () => <nav /> }))
vi.mock("@/components/nav/VisitorTracker", () => ({ VisitorTracker: () => null }))
vi.mock("@/components/ui/WhatsAppFloatingButton", () => ({
  WhatsAppFloatingButton: () => null,
}))

import PublicLayout from "../layout"

function renderLayout() {
  const { container } = render(<PublicLayout>{<p>isi halaman</p>}</PublicLayout>)
  const blocks = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
  return blocks.map((b) => JSON.parse(b.innerHTML))
}

describe("PublicLayout structured data", () => {
  it("emits exactly one Organization and one WebSite block", () => {
    const schemas = renderLayout()

    expect(schemas.filter((s) => s["@type"] === "Organization")).toHaveLength(1)
    expect(schemas.filter((s) => s["@type"] === "WebSite")).toHaveLength(1)
    expect(schemas).toHaveLength(2)
  })

  it("still renders the page content alongside the schema", () => {
    const { container } = render(<PublicLayout>{<p>isi halaman</p>}</PublicLayout>)

    expect(container.textContent).toContain("isi halaman")
  })
})
