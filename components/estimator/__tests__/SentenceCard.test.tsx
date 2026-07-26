import { useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { EstimateParams, PricingConfig } from "@/types"
import { DEFAULT_PARAMS } from "@/types"
import { totalTripDaysToNights } from "@/lib/estimate/nights"
import { useIsDesktop } from "@/hooks/use-is-desktop"

vi.mock("@/hooks/use-is-desktop", () => ({
  useIsDesktop: vi.fn(() => true),
}))

import { SentenceCard } from "../SentenceCard"

// Same mock pricing shape used by lib/estimate/__tests__/hotel-selection.test.ts and
// components/estimator/__tests__/EstimatorPreFill.test.tsx.
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
      {
        id: "kayan-hotel",
        city: "MADINAH",
        tier: "STANDARD",
        sarPerNight: 700,
        label: "Kayan Hotel",
        sublabel: "standard Madinah",
        monthlyPrices: { 11: 900 },
      },
      {
        id: "dallah-taiba",
        city: "MADINAH",
        tier: "PREMIUM",
        sarPerNight: 1600,
        label: "Dallah Taiba",
        sublabel: "premium Madinah",
        monthlyPrices: {},
      },
    ],
    MAKKAH: [
      {
        id: "olayan-ajyad",
        city: "MAKKAH",
        tier: "STANDARD",
        sarPerNight: 950,
        label: "Olayan Ajyad",
        sublabel: "standard Ajyad",
        monthlyPrices: { 11: 1250 },
      },
      {
        id: "voco-makkah",
        city: "MAKKAH",
        tier: "PREMIUM",
        sarPerNight: 600,
        label: "Voco",
        sublabel: "upper Makkah shuttle",
        monthlyPrices: {},
      },
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
    TRIPLE: { paxPerRoom: 3, multiplier: 1.0 },
    DOUBLE: { paxPerRoom: 2, multiplier: 1.0 },
    QUINT: { paxPerRoom: 5, multiplier: 1.0 },
  },
}

const baseParams: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 8,
  pax: 2,
  hotelTier: "STANDARD",
  madinahHotelId: "kayan-hotel",
  makkahHotelId: "olayan-ajyad",
  roomType: "DOUBLE",
  airline: "STANDARD",
  services: ["VISA", "SISKOPATUH"],
  fullboard: true,
  travelMonth: 11,
}

// Stateful wrapper so field-body interactions (e.g. toggling a service) actually
// flow back through onChange -> params, letting tests observe multi-step behavior.
function StatefulSentenceCard({
  initialParams,
  onChangeSpy,
  onStartOverSpy,
}: {
  initialParams: EstimateParams
  onChangeSpy: (patch: Partial<EstimateParams>) => void
  onStartOverSpy?: () => void
}) {
  const [params, setParams] = useState(initialParams)
  function handleChange(patch: Partial<EstimateParams>) {
    onChangeSpy(patch)
    setParams((prev) => ({ ...prev, ...patch }))
  }
  return (
    <SentenceCard params={params} pricing={mockPricing} onChange={handleChange} onStartOver={onStartOverSpy} />
  )
}

beforeEach(() => {
  vi.mocked(useIsDesktop).mockReturnValue(true)
})

describe("SentenceCard", () => {
  it("reflects params in the rendered chip values", () => {
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={vi.fn()} />)

    expect(screen.getByLabelText("Jumlah hari: 12 hari, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Jumlah peserta: 2 orang, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Bulan: November, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Malam di Madinah: 4 malam, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Hotel Madinah: Kayan Hotel, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Malam di Makkah: 8 malam, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Hotel Makkah: Olayan Ajyad, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Tipe kamar: Double, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Full board: ya, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Maskapai: Batik Air, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Layanan tambahan: 2 dipilih, klik untuk ubah")).toBeDefined()
  })

  it("shows 'belum dipilih'/'belum ada' fallbacks when a field is unset", () => {
    const params: EstimateParams = { ...baseParams, travelMonth: undefined, services: [] }
    render(<SentenceCard params={params} pricing={mockPricing} onChange={vi.fn()} />)

    expect(screen.getByLabelText("Bulan: belum dipilih, klik untuk ubah")).toBeDefined()
    expect(screen.getByLabelText("Layanan tambahan: belum ada, klik untuk ubah")).toBeDefined()
  })

  it("redistributes nights correctly when the days chip's stepper changes", () => {
    const onChange = vi.fn()
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText("Jumlah hari: 12 hari, klik untuk ubah"))
    fireEvent.click(screen.getByLabelText("Tambah"))

    const expected = totalTripDaysToNights(13)
    expect(onChange).toHaveBeenCalledWith(expected)
  })

  it("redistributes nights correctly for a different starting total", () => {
    const onChange = vi.fn()
    const params: EstimateParams = { ...baseParams, nightsMadinah: 4, nightsMakkah: 2 } // total 6
    render(<SentenceCard params={params} pricing={mockPricing} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText("Jumlah hari: 6 hari, klik untuk ubah"))
    fireEvent.click(screen.getByLabelText("Tambah"))

    const expected = totalTripDaysToNights(7)
    expect(onChange).toHaveBeenCalledWith(expected)
  })

  it("calls onChange with hotelTier + city hotel id when a hotel is selected in the Madinah picker", () => {
    const onChange = vi.fn()
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText("Hotel Madinah: Kayan Hotel, klik untuk ubah"))
    fireEvent.click(screen.getByText("Dallah Taiba"))

    expect(onChange).toHaveBeenCalledWith({ hotelTier: "PREMIUM", madinahHotelId: "dallah-taiba" })
  })

  it("calls onChange with hotelTier + city hotel id when a hotel is selected in the Makkah picker", () => {
    const onChange = vi.fn()
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText("Hotel Makkah: Olayan Ajyad, klik untuk ubah"))
    fireEvent.click(screen.getByText("Voco"))

    expect(onChange).toHaveBeenCalledWith({ hotelTier: "PREMIUM", makkahHotelId: "voco-makkah" })
  })

  it("keeps the services editor open across multiple toggles, closing only via Selesai", () => {
    const onChangeSpy = vi.fn()
    render(<StatefulSentenceCard initialParams={baseParams} onChangeSpy={onChangeSpy} />)

    fireEvent.click(screen.getByLabelText("Layanan tambahan: 2 dipilih, klik untuk ubah"))
    expect(screen.getByText("Layanan Tambahan")).toBeDefined()

    fireEvent.click(screen.getByText("Tasreh Raudhah"))
    expect(screen.getByText("Layanan Tambahan")).toBeDefined() // still open
    expect(onChangeSpy).toHaveBeenCalledWith({ services: ["VISA", "SISKOPATUH", "TASREH"] })

    fireEvent.click(screen.getByText("Transportasi"))
    expect(screen.getByText("Layanan Tambahan")).toBeDefined() // still open after a 2nd toggle
    expect(onChangeSpy).toHaveBeenCalledWith({ services: ["VISA", "SISKOPATUH", "TASREH", "TRANSPORT"] })

    fireEvent.click(screen.getByRole("button", { name: "Selesai" }))
    expect(screen.queryByText("Layanan Tambahan")).toBeNull()
  })

  it("exposes an aria-label per chip and toggles aria-expanded with open state", () => {
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={vi.fn()} />)

    const monthChip = screen.getByLabelText("Bulan: November, klik untuk ubah")
    expect(monthChip.getAttribute("aria-expanded")).toBe("false")

    fireEvent.click(monthChip)
    expect(monthChip.getAttribute("aria-expanded")).toBe("true")

    fireEvent.click(monthChip)
    expect(monthChip.getAttribute("aria-expanded")).toBe("false")
  })

  it("only allows one field editor open at a time", () => {
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={vi.fn()} />)

    fireEvent.click(screen.getByLabelText("Bulan: November, klik untuk ubah"))
    expect(screen.getByText("Bulan Keberangkatan")).toBeDefined()

    fireEvent.click(screen.getByLabelText("Tipe kamar: Double, klik untuk ubah"))
    expect(screen.queryByText("Bulan Keberangkatan")).toBeNull()
    expect(screen.getByText("Tipe Kamar")).toBeDefined()
  })

  it("closes an already-open field when its chip is clicked again", () => {
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={vi.fn()} />)

    const chip = screen.getByLabelText("Bulan: November, klik untuk ubah")
    fireEvent.click(chip)
    expect(screen.getByText("Bulan Keberangkatan")).toBeDefined()

    fireEvent.click(chip)
    expect(screen.queryByText("Bulan Keberangkatan")).toBeNull()
  })

  it("stops the sentence after the room-type chip on mobile — no airline/services chips render", () => {
    vi.mocked(useIsDesktop).mockReturnValue(false)
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={vi.fn()} />)

    expect(screen.getByLabelText("Tipe kamar: Double, klik untuk ubah")).toBeDefined()
    expect(screen.queryByLabelText(/^Full board:/)).toBeNull()
    expect(screen.queryByLabelText(/^Maskapai:/)).toBeNull()
    expect(screen.queryByLabelText(/^Layanan tambahan:/)).toBeNull()
  })

  it("requires AlertDialog confirmation for 'Ceritakan ulang dari nol'; canceling leaves onChange uncalled", () => {
    const onChange = vi.fn()
    render(<SentenceCard params={baseParams} pricing={mockPricing} onChange={onChange} />)

    fireEvent.click(screen.getByText("Ceritakan ulang dari nol"))
    expect(screen.getByText("Mulai cerita dari awal?")).toBeDefined()

    fireEvent.click(screen.getByText("Batal"))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText("Mulai cerita dari awal?")).toBeNull()
  })

  it("confirming start-over resets params, explicitly clears optional fields, closes any open editor, and calls onStartOver", () => {
    const onChange = vi.fn()
    const onStartOver = vi.fn()
    render(
      <SentenceCard params={baseParams} pricing={mockPricing} onChange={onChange} onStartOver={onStartOver} />
    )

    // Open a field editor first, to prove start-over closes it.
    fireEvent.click(screen.getByLabelText("Tipe kamar: Double, klik untuk ubah"))
    expect(screen.getByText("Tipe Kamar")).toBeDefined()

    fireEvent.click(screen.getByText("Ceritakan ulang dari nol"))
    fireEvent.click(screen.getByText("Ya, mulai ulang"))

    expect(onChange).toHaveBeenCalledTimes(1)
    const patch = onChange.mock.calls[0][0] as Partial<EstimateParams>

    // DEFAULT_PARAMS fields carried over
    expect(patch.nightsMadinah).toBe(DEFAULT_PARAMS.nightsMadinah)
    expect(patch.nightsMakkah).toBe(DEFAULT_PARAMS.nightsMakkah)
    expect(patch.hotelTier).toBe(DEFAULT_PARAMS.hotelTier)

    // Explicitly-cleared optional fields must be present as keys, not merely absent.
    expect(Object.prototype.hasOwnProperty.call(patch, "madinahHotelId")).toBe(true)
    expect(patch.madinahHotelId).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(patch, "makkahHotelId")).toBe(true)
    expect(patch.makkahHotelId).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(patch, "travelMonth")).toBe(true)
    expect(patch.travelMonth).toBeUndefined()

    expect(screen.queryByText("Tipe Kamar")).toBeNull()
    expect(onStartOver).toHaveBeenCalledTimes(1)
  })
})
