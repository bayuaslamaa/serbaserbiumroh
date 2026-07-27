import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { SERVICE_KEYS } from "@/types"
import type { PricingConfig, ServiceFeeConfig, ServiceKey } from "@/types"
import { SERVICE_FEE_ROWS } from "@/lib/db/service-fees"

import { ServiceCheckboxGrid, TRANSPORT_GROUP_LABEL } from "../ServiceCheckboxGrid"

// Priced from the seeded catalogue rather than a hand-written list, so this file cannot quietly
// disagree with what the estimator actually offers. Everything is forced enabled: MUTHOWIF ships
// disabled until the admin sets its real fee, and this suite is about reachability, not defaults.
function pricingWith(overrides: Partial<Record<ServiceKey, Partial<ServiceFeeConfig>>> = {}): PricingConfig {
  const services = Object.fromEntries(
    SERVICE_FEE_ROWS.map(({ key, ...config }) => [key, { ...config, enabled: true, ...overrides[key] }])
  ) as Record<ServiceKey, ServiceFeeConfig>

  return {
    rates: { SAR: 4700, USD: 17300 },
    hotels: {
      MADINAH: {
        ECONOMY: { sarPerNight: 450, label: "Ekonomi", sublabel: "2-3★", monthlyPrices: {} },
        STANDARD: { sarPerNight: 650, label: "Standard", sublabel: "4★", monthlyPrices: {} },
        PELATARAN: { sarPerNight: 2000, label: "Pelataran", sublabel: "Pelataran", monthlyPrices: {} },
        PREMIUM: { sarPerNight: 3500, label: "Premium", sublabel: "5★", monthlyPrices: {} },
      },
      MAKKAH: {
        ECONOMY: { sarPerNight: 800, label: "Ekonomi", sublabel: "2-3★", monthlyPrices: {} },
        STANDARD: { sarPerNight: 1300, label: "Standard", sublabel: "3★", monthlyPrices: {} },
        PELATARAN: { sarPerNight: 3500, label: "Pelataran", sublabel: "Pelataran", monthlyPrices: {} },
        PREMIUM: { sarPerNight: 6000, label: "Premium", sublabel: "5★", monthlyPrices: {} },
      },
    },
    airlines: {
      BUDGET: { idr: 12500000, label: "Lion Air" },
      STANDARD: { idr: 14500000, label: "Batik Air" },
      GARUDA: { idr: 17000000, label: "Garuda" },
      BUSINESS: { idr: 25000000, label: "Business" },
    },
    services,
    roomMultipliers: {
      QUINT: { paxPerRoom: 5, multiplier: 1.0 },
      QUAD: { paxPerRoom: 4, multiplier: 1.0 },
      TRIPLE: { paxPerRoom: 3, multiplier: 1.0 },
      DOUBLE: { paxPerRoom: 2, multiplier: 1.0 },
    },
  }
}

describe("ServiceCheckboxGrid", () => {
  it("offers a checkbox for every enabled key in SERVICE_KEYS", () => {
    const pricing = pricingWith()
    render(<ServiceCheckboxGrid pricing={pricing} value={[]} onChange={vi.fn()} />)

    for (const key of SERVICE_KEYS) {
      expect(
        screen.queryByText(pricing.services[key].label),
        `${key} is offered by the catalogue but the operator cannot tick it`
      ).not.toBeNull()
    }
    expect(screen.getAllByRole("checkbox")).toHaveLength(SERVICE_KEYS.length)
  })

  it("renders the services in SERVICE_KEYS order", () => {
    const pricing = pricingWith()
    const { container } = render(<ServiceCheckboxGrid pricing={pricing} value={[]} onChange={vi.fn()} />)

    const rendered = Array.from(container.querySelectorAll("label span:first-of-type")).map(
      (el) => el.textContent
    )
    expect(rendered).toEqual(SERVICE_KEYS.map((key) => pricing.services[key].label))
  })

  it("groups the transport legs under their own heading", () => {
    const pricing = pricingWith()
    render(<ServiceCheckboxGrid pricing={pricing} value={[]} onChange={vi.fn()} />)

    const heading = screen.getByRole("heading", { name: TRANSPORT_GROUP_LABEL })
    const group = heading.closest("section")
    expect(group).not.toBeNull()

    const groupedLabels = Array.from(group!.querySelectorAll("label span:first-of-type")).map(
      (el) => el.textContent
    )
    const legLabels = SERVICE_KEYS.filter((key) => key.startsWith("TRANSPORT_")).map(
      (key) => pricing.services[key].label
    )
    expect(groupedLabels).toEqual(legLabels)

    // The non-transport services stay outside the group, where they remain findable.
    expect(group!.textContent).not.toContain(pricing.services.TOUR_MAKKAH.label)
    expect(group!.textContent).not.toContain(pricing.services.MUTHOWIF.label)
  })

  it("hides a service the admin has disabled", () => {
    const pricing = pricingWith({ MUTHOWIF: { enabled: false } })
    render(<ServiceCheckboxGrid pricing={pricing} value={[]} onChange={vi.fn()} />)

    expect(screen.queryByText(pricing.services.MUTHOWIF.label)).toBeNull()
    expect(screen.getAllByRole("checkbox")).toHaveLength(SERVICE_KEYS.length - 1)
  })

  it("toggles a transport leg on and off without disturbing the other selections", () => {
    const pricing = pricingWith()
    const onChange = vi.fn()
    const { rerender } = render(
      <ServiceCheckboxGrid pricing={pricing} value={["VISA"]} onChange={onChange} />
    )

    fireEvent.click(screen.getByText(pricing.services.TRANSPORT_MAKKAH_MADINAH.label))
    expect(onChange).toHaveBeenCalledWith(["VISA", "TRANSPORT_MAKKAH_MADINAH"])

    rerender(
      <ServiceCheckboxGrid
        pricing={pricing}
        value={["VISA", "TRANSPORT_MAKKAH_MADINAH"]}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByText(pricing.services.TRANSPORT_MAKKAH_MADINAH.label))
    expect(onChange).toHaveBeenLastCalledWith(["VISA"])
  })
})
