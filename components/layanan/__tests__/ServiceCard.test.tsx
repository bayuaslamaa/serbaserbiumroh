import { render, screen } from "@testing-library/react"
import { Stamp } from "lucide-react"
import { describe, expect, it } from "vitest"
import { ServiceCard } from "../ServiceCard"
import { services, type Service } from "@/lib/services/catalog"

const base: Service = {
  id: "stub",
  name: "Layanan Stub",
  description: "Deskripsi layanan stub.",
  price: "Mulai Rp 1 jt",
  icon: Stamp,
  href: "/stub",
}

describe("ServiceCard", () => {
  it("renders name, description and price", () => {
    render(<ServiceCard service={base} />)

    expect(screen.getByText("Layanan Stub")).toBeDefined()
    expect(screen.getByText("Deskripsi layanan stub.")).toBeDefined()
    expect(screen.getByText("Mulai Rp 1 jt")).toBeDefined()
  })

  it("omits the price when the service has none", () => {
    render(<ServiceCard service={{ ...base, price: "" }} />)

    expect(screen.queryByText(/Mulai Rp/)).toBeNull()
    expect(screen.getByText("Selengkapnya")).toBeDefined()
  })

  it("shows the BARU badge only for a new service", () => {
    const { rerender } = render(<ServiceCard service={base} />)
    expect(screen.queryByText("BARU")).toBeNull()

    rerender(<ServiceCard service={{ ...base, isNew: true }} />)
    expect(screen.getByText("BARU")).toBeDefined()
  })

  it("links to the service href", () => {
    render(<ServiceCard service={base} />)

    expect(screen.getByRole("link")).toHaveAttribute("href", "/stub")
  })

  it("opens an external href in a new tab", () => {
    render(
      <ServiceCard service={{ ...base, href: "https://wa.me/62812?text=halo" }} />
    )

    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("renders one card per catalog entry with its own href", () => {
    render(
      <>
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </>
    )

    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"))
    expect(hrefs).toHaveLength(services.length)
    expect(hrefs).toEqual(services.map((s) => s.href))
    expect(screen.getAllByText("BARU")).toHaveLength(1)
  })
})
