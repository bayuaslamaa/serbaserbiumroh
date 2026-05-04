import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PricingConfig } from "@/types"
import { DEFAULT_PARAMS } from "@/types"

// Mock next/navigation (used in EstimatorClient)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock toast hook (used in EstimatorClient)
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
  useToast: () => ({ toast: vi.fn() }),
}))

import { ParamsPanel } from "../ParamsPanel"
import { EstimatorClient } from "../EstimatorClient"

const mockPricing: PricingConfig = {
  rates: { SAR: 4700, USD: 17300 },
  hotels: {
    MADINAH: {
      ECONOMY: { sarPerNight: 450, label: "Ekonomi Madinah", sublabel: "2-3★", monthlyPrices: {} },
      STANDARD: { sarPerNight: 650, label: "Standard Madinah", sublabel: "4★", monthlyPrices: {} },
      PELATARAN: { sarPerNight: 2000, label: "Pelataran Nabawi", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 3500, label: "Premium Madinah", sublabel: "5★", monthlyPrices: {} },
    },
    MAKKAH: {
      ECONOMY: { sarPerNight: 800, label: "Ekonomi Makkah", sublabel: "2-3★", monthlyPrices: {} },
      STANDARD: { sarPerNight: 1300, label: "Safwa Tower 3", sublabel: "3★", monthlyPrices: {} },
      PELATARAN: { sarPerNight: 3500, label: "Pelataran Haram", sublabel: "Pelataran", monthlyPrices: {} },
      PREMIUM: { sarPerNight: 6000, label: "Premium Makkah", sublabel: "5★", monthlyPrices: {} },
    },
  },
  airlines: {
    BUDGET: { idr: 12500000, label: "Lion Air" },
    STANDARD: { idr: 14500000, label: "Batik Air" },
    GARUDA: { idr: 17000000, label: "Garuda" },
    BUSINESS: { idr: 25000000, label: "Business" },
  },
  services: {
    VISA: { currency: "USD", amount: 165, label: "Visa Umroh Reguler", enabled: true, divideByPax: false },
    SISKOPATUH: { currency: "IDR", amount: 200000, label: "Siskopatuh", enabled: true, divideByPax: false },
    TASREH: { currency: "SAR", amount: 25, label: "Tasreh Raudhah", enabled: true, divideByPax: false },
    TRANSPORT: { currency: "SAR", amount: 325, label: "Transportasi", enabled: true, divideByPax: true },
    TOUR_MAKKAH: { currency: "SAR", amount: 150, label: "Tour Makkah", enabled: true, divideByPax: true },
    TOUR_MADINAH: { currency: "SAR", amount: 150, label: "Tour Madinah", enabled: true, divideByPax: true },
  },
  roomMultipliers: {
    QUAD: { paxPerRoom: 4, multiplier: 1.0 },
    TRIPLE: { paxPerRoom: 3, multiplier: 1.25 },
    DOUBLE: { paxPerRoom: 2, multiplier: 1.5 },
    SINGLE: { paxPerRoom: 1, multiplier: 2.8 },
  },
}

describe("ParamsPanel — storySource badge", () => {
  it("shows badge when storySource is set", () => {
    render(
      <ParamsPanel
        params={DEFAULT_PARAMS}
        pricing={mockPricing}
        onChange={vi.fn()}
        storySource="Inka"
      />
    )
    expect(screen.getByText("berdasarkan cerita Inka")).toBeDefined()
  })

  it("shows no badge when storySource is undefined", () => {
    render(
      <ParamsPanel
        params={DEFAULT_PARAMS}
        pricing={mockPricing}
        onChange={vi.fn()}
      />
    )
    expect(screen.queryByText(/berdasarkan cerita/)).toBeNull()
  })

  it("shows no badge when storySource is not passed", () => {
    const { container } = render(
      <ParamsPanel
        params={DEFAULT_PARAMS}
        pricing={mockPricing}
        onChange={vi.fn()}
      />
    )
    expect(container.querySelector("[data-badge]")).toBeNull()
    expect(screen.queryByText(/berdasarkan cerita/)).toBeNull()
  })
})

describe("EstimatorClient — initialParams pre-fill", () => {
  beforeEach(() => {
    // Prevent unhandled fetch errors in jsdom
    vi.stubGlobal("fetch", vi.fn())
  })

  it("uses initialParams to override default nightsMakkah", () => {
    render(
      <EstimatorClient
        pricingConfig={mockPricing}
        initialParams={{ nightsMakkah: 10 }}
      />
    )
    // Stepper renders an <input type="number" value="10"> — use getByDisplayValue
    expect(screen.getByDisplayValue("10")).toBeDefined()
  })

  it("uses initialParams to override default pax", () => {
    render(
      <EstimatorClient
        pricingConfig={mockPricing}
        initialParams={{ pax: 3 }}
      />
    )
    // pax stepper input should show 3
    expect(screen.getByDisplayValue("3")).toBeDefined()
  })

  it("falls back to DEFAULT_PARAMS nightsMakkah=9 when initialParams is undefined", () => {
    render(<EstimatorClient pricingConfig={mockPricing} />)
    // DEFAULT_PARAMS has nightsMakkah: 9
    expect(screen.getByDisplayValue("9")).toBeDefined()
  })

  it("falls back to DEFAULT_PARAMS when initialParams is empty object", () => {
    render(<EstimatorClient pricingConfig={mockPricing} initialParams={{}} />)
    // DEFAULT_PARAMS has nightsMakkah: 9
    expect(screen.getByDisplayValue("9")).toBeDefined()
  })

  it("passes storySource badge down to ParamsPanel", () => {
    render(
      <EstimatorClient
        pricingConfig={mockPricing}
        storySource="Ahmad"
      />
    )
    expect(screen.getByText("berdasarkan cerita Ahmad")).toBeDefined()
  })

  it("shows no badge when storySource is not provided", () => {
    render(<EstimatorClient pricingConfig={mockPricing} />)
    expect(screen.queryByText(/berdasarkan cerita/)).toBeNull()
  })
})
