import { fireEvent, render, screen } from "@testing-library/react"
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
  hotelOptions: {
    MADINAH: [
      { id: "kayan-hotel", city: "MADINAH", tier: "STANDARD", sarPerNight: 700, label: "Kayan Hotel", sublabel: "standard Madinah", monthlyPrices: { 11: 900 } },
      { id: "dallah-taiba", city: "MADINAH", tier: "PREMIUM", sarPerNight: 1600, label: "Dallah Taiba", sublabel: "premium Madinah", monthlyPrices: {} },
    ],
    MAKKAH: [
      { id: "olayan-ajyad", city: "MAKKAH", tier: "STANDARD", sarPerNight: 950, label: "Olayan Ajyad", sublabel: "standard Ajyad", monthlyPrices: { 11: 1250 } },
      { id: "voco-makkah", city: "MAKKAH", tier: "PREMIUM", sarPerNight: 600, label: "Voco", sublabel: "upper Makkah shuttle", monthlyPrices: {} },
    ],
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

  it("renders imported hotel options per city", () => {
    render(
      <ParamsPanel
        params={DEFAULT_PARAMS}
        pricing={mockPricing}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText("Hotel Madinah")).toBeDefined()
    expect(screen.getByText("Hotel Makkah")).toBeDefined()
    expect(screen.getByText("Kayan Hotel")).toBeDefined()
    expect(screen.getByText("Olayan Ajyad")).toBeDefined()
    expect(screen.getByText("Dallah Taiba")).toBeDefined()
    expect(screen.getByText("Voco")).toBeDefined()
  })

  it("renders no-flight airline option", () => {
    render(
      <ParamsPanel
        params={DEFAULT_PARAMS}
        pricing={mockPricing}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText("Tanpa penerbangan")).toBeDefined()
    expect(screen.getByText("Tiket diurus sendiri")).toBeDefined()
  })

  it("updates the city-specific hotel ID when an imported hotel is selected", () => {
    const onChange = vi.fn()
    render(
      <ParamsPanel
        params={DEFAULT_PARAMS}
        pricing={mockPricing}
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByText("Olayan Ajyad"))
    expect(onChange).toHaveBeenCalledWith({ hotelTier: "STANDARD", makkahHotelId: "olayan-ajyad" })
  })

  it("updates seasonal hotel badges when travelMonth is selected", () => {
    render(
      <ParamsPanel
        params={{ ...DEFAULT_PARAMS, travelMonth: 11 }}
        pricing={mockPricing}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText("SAR 900/mlm Madinah")).toBeDefined()
    expect(screen.getByText("SAR 1250/mlm Makkah")).toBeDefined()
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
    // SentenceCard is the default view now; the Makkah-nights chip shows "10 malam".
    expect(screen.getByText("10 malam")).toBeDefined()
  })

  it("uses initialParams to override default pax", () => {
    render(
      <EstimatorClient
        pricingConfig={mockPricing}
        initialParams={{ pax: 3 }}
      />
    )
    // SentenceCard's pax chip should show "3 orang".
    expect(screen.getByText("3 orang")).toBeDefined()
  })

  it("falls back to DEFAULT_PARAMS nightsMakkah=9 when initialParams is undefined", () => {
    render(<EstimatorClient pricingConfig={mockPricing} />)
    // DEFAULT_PARAMS has nightsMakkah: 9 — shown on SentenceCard's Makkah-nights chip.
    expect(screen.getByText("9 malam")).toBeDefined()
  })

  it("falls back to DEFAULT_PARAMS when initialParams is empty object", () => {
    render(<EstimatorClient pricingConfig={mockPricing} initialParams={{}} />)
    // DEFAULT_PARAMS has nightsMakkah: 9 — shown on SentenceCard's Makkah-nights chip.
    expect(screen.getByText("9 malam")).toBeDefined()
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
