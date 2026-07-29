import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { HotelPicker } from "../HotelPicker"
import type { HotelOptionConfig, RoomType } from "@/types"

const hotels: HotelOptionConfig[] = [
  {
    id: "h1",
    city: "MADINAH",
    tier: "STANDARD",
    sarPerNight: 650,
    label: "Al Ansar Mall Hotel",
    sublabel: "700m dari masjid",
    monthlyPrices: { 11: 700 },
    realMonthlyPrices: { 7: { QUAD: 720, TRIPLE: 640, DOUBLE: 560 } },
  },
  {
    id: "h2",
    city: "MADINAH",
    tier: "PREMIUM",
    sarPerNight: 900,
    label: "Anwar Al Madinah Mövenpick",
    sublabel: "50m dari masjid",
    monthlyPrices: {},
  },
  {
    id: "h3",
    city: "MADINAH",
    tier: "ECONOMY",
    sarPerNight: 250,
    label: "Dar Al Eiman Royal",
    sublabel: "1km dari masjid",
    monthlyPrices: {},
  },
]

function renderPicker(opts: {
  selectedId?: string
  travelMonth?: number
  roomType?: RoomType
  onSelect?: (id: string) => void
} = {}) {
  const onSelect = opts.onSelect ?? vi.fn()
  render(
    <HotelPicker
      hotels={hotels}
      selectedId={opts.selectedId}
      travelMonth={opts.travelMonth}
      roomType={opts.roomType}
      onSelect={onSelect}
    />
  )
  return onSelect
}

describe("HotelPicker", () => {
  it("filters the list by hotel name, case-insensitively", () => {
    renderPicker()
    const search = screen.getByLabelText("Cari hotel")

    fireEvent.change(search, { target: { value: "anwar" } })

    expect(screen.getByText("Anwar Al Madinah Mövenpick")).toBeDefined()
    expect(screen.queryByText("Al Ansar Mall Hotel")).toBeNull()
    expect(screen.queryByText("Dar Al Eiman Royal")).toBeNull()
  })

  it("narrows results to the selected tier, and 'Semua' clears the filter", () => {
    renderPicker()

    fireEvent.click(screen.getByText("Premium"))
    expect(screen.getByText("Anwar Al Madinah Mövenpick")).toBeDefined()
    expect(screen.queryByText("Al Ansar Mall Hotel")).toBeNull()
    expect(screen.queryByText("Dar Al Eiman Royal")).toBeNull()

    fireEvent.click(screen.getByText("Semua"))
    expect(screen.getByText("Al Ansar Mall Hotel")).toBeDefined()
    expect(screen.getByText("Anwar Al Madinah Mövenpick")).toBeDefined()
    expect(screen.getByText("Dar Al Eiman Royal")).toBeDefined()
  })

  it("narrows results to hotels at or below the SAR 300 price threshold", () => {
    renderPicker()

    fireEvent.click(screen.getByText("≤ SAR 300"))
    expect(screen.getByText("Dar Al Eiman Royal")).toBeDefined() // 250 SAR
    expect(screen.queryByText("Al Ansar Mall Hotel")).toBeNull() // 650 SAR
    expect(screen.queryByText("Anwar Al Madinah Mövenpick")).toBeNull() // 900 SAR

    fireEvent.click(screen.getByText("≤ SAR 300"))
    expect(screen.getByText("Al Ansar Mall Hotel")).toBeDefined()
    expect(screen.getByText("Anwar Al Madinah Mövenpick")).toBeDefined()
  })

  it("calls onSelect with the hotel id when a row is clicked", () => {
    const onSelect = renderPicker()

    fireEvent.click(screen.getByText("Dar Al Eiman Royal"))

    expect(onSelect).toHaveBeenCalledWith("h3")
  })

  it("keeps the selected hotel visible when it doesn't match the active search", () => {
    renderPicker({ selectedId: "h2" })

    fireEvent.change(screen.getByLabelText("Cari hotel"), { target: { value: "Dar" } })

    // Selected hotel (Anwar) stays pinned even though the search matches only "Dar Al Eiman"
    expect(screen.getByText("Anwar Al Madinah Mövenpick")).toBeDefined()
    expect(screen.getByText("Dar Al Eiman Royal")).toBeDefined()
    expect(screen.getByText("Dipilih")).toBeDefined()
  })

  it("keeps the selected hotel visible when it doesn't match the active tier filter", () => {
    renderPicker({ selectedId: "h1" }) // STANDARD

    fireEvent.click(screen.getByText("Premium"))

    expect(screen.getByText("Al Ansar Mall Hotel")).toBeDefined() // pinned, though STANDARD
    expect(screen.getByText("Anwar Al Madinah Mövenpick")).toBeDefined() // matches PREMIUM filter
    expect(screen.queryByText("Dar Al Eiman Royal")).toBeNull()
  })

  it("renders an empty-state message instead of a blank list when nothing matches", () => {
    renderPicker()

    fireEvent.change(screen.getByLabelText("Cari hotel"), { target: { value: "nonexistent hotel xyz" } })

    expect(screen.getByText(/Tidak ada hotel/)).toBeDefined()
    expect(screen.queryByText("Al Ansar Mall Hotel")).toBeNull()
    expect(screen.queryByText("Anwar Al Madinah Mövenpick")).toBeNull()
    expect(screen.queryByText("Dar Al Eiman Royal")).toBeNull()
  })

  it("shows the seasonal rate for travelMonth when present", () => {
    renderPicker({ travelMonth: 11 })

    expect(screen.getByText("SAR 700/mlm")).toBeDefined() // h1's November override
  })

  it("falls back to the base sarPerNight when no seasonal override exists for travelMonth", () => {
    renderPicker({ travelMonth: 3 })

    expect(screen.getByText("SAR 650/mlm")).toBeDefined() // h1 has no override for month 3
  })

  it("falls back to the base sarPerNight when travelMonth is undefined", () => {
    renderPicker()

    expect(screen.getByText("SAR 650/mlm")).toBeDefined()
  })

  it("shows the rate for the selected room type, not the quad rate", () => {
    renderPicker({ travelMonth: 7, roomType: "DOUBLE" })

    expect(screen.getByText("SAR 560/mlm")).toBeDefined() // h1's July double rate
    expect(screen.queryByText("SAR 720/mlm")).toBeNull()
  })

  it("shows the quad rate when quad is selected", () => {
    renderPicker({ travelMonth: 7, roomType: "QUAD" })

    expect(screen.getByText("SAR 720/mlm")).toBeDefined()
  })

  it("shows the quad rate for QUINT, which no catalog prices", () => {
    renderPicker({ travelMonth: 7, roomType: "QUINT" })

    expect(screen.getByText("SAR 720/mlm")).toBeDefined()
  })

  it("renders hotels carrying no real prices without error when a room type is selected", () => {
    renderPicker({ travelMonth: 7, roomType: "DOUBLE" })

    expect(screen.getByText("SAR 900/mlm")).toBeDefined() // h2 has no realMonthlyPrices
  })
})
