import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BudgetBreakdown, EstimateParams, PricingConfig } from "@/types"

const routerPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }))
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }))
vi.mock("../InputPanel", () => ({ InputPanel: () => null }))
vi.mock("../ParamsPanel", () => ({
  ParamsPanel: ({ onChange }: { onChange: (patch: Partial<EstimateParams>) => void }) => (
    <button onClick={() => onChange({ nightsMakkah: 9 })}>change params</button>
  ),
}))
vi.mock("../BudgetBreakdown", () => ({
  BudgetBreakdown: ({ display, onSetAmount, onSetUnitPrice, onResetRow }: {
    display: { rows: { key: string; idr: number; unitPrice: number }[]; totalIdrPax: number }
    onSetAmount: (key: string, value: number) => void
    onSetUnitPrice: (key: string, value: number) => void
    onResetRow: (key: string) => void
  }) => {
    const flight = display.rows.find((row) => row.key === "flight")
    return (
      <div>
        <span data-testid="total">{display.totalIdrPax}</span>
        <span data-testid="flight">{flight?.idr}</span>
        <span data-testid="flight-unit">{flight?.unitPrice}</span>
        <button onClick={() => onSetAmount("flight", 12_000_000)}>override flight</button>
        <button onClick={() => onSetUnitPrice("flight", 8_000_000)}>unit flight</button>
        <button onClick={() => onResetRow("flight")}>reset flight</button>
      </div>
    )
  },
}))
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock("@/lib/budget/calculate", () => ({
  calculateBudget: vi.fn((params: EstimateParams) => makeBreakdown(params.nightsMakkah)),
}))

import { EstimatorClient } from "../EstimatorClient"

const params: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 8,
  pax: 2,
  hotelTier: "STANDARD",
  roomType: "QUAD",
  airline: "STANDARD",
  services: [],
  fullboard: true,
}

function makeBreakdown(nightsMakkah: number): BudgetBreakdown {
  const detail = {
    label: "Hotel", tier: "STANDARD" as const, sarPerNight: 1, nights: 1,
    roomPax: 4, roomCount: 1, totalPax: 2, roomMultiplier: 1,
  }
  const hotelMakkahIdr = nightsMakkah * 1_000_000
  return {
    hotelMadinahIdr: 4_000_000,
    hotelMakkahIdr,
    hotelMadinahDetail: detail,
    hotelMakkahDetail: { ...detail, nights: nightsMakkah },
    servicesIdr: 0,
    serviceItems: [],
    flightIdr: 10_000_000,
    totalIdrPax: 4_000_000 + hotelMakkahIdr + 10_000_000,
    totalIdrGrp: (4_000_000 + hotelMakkahIdr + 10_000_000) * 2,
    sarRate: 4700,
    usdRate: 17300,
  }
}

describe("EstimatorClient override orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({}) }))
  })

  it("keeps an override sticky across parameter changes and serializes the latest snapshot", async () => {
    render(
      <EstimatorClient
        pricingConfig={{} as PricingConfig}
        estimateId="e1"
        existingParams={params}
        existingOverrides={{ overrides: {}, customRows: [] }}
        savedAt="2026-07-12T00:00:00.000Z"
      />,
    )

    fireEvent.click(screen.getByText("override flight"))
    expect(screen.getByTestId("flight").textContent).toBe("12000000")

    fireEvent.click(screen.getByText("change params"))
    expect(screen.getByTestId("flight").textContent).toBe("12000000")
    expect(screen.getByTestId("total").textContent).toBe("25000000")

    fireEvent.click(screen.getByText("Perbarui Estimasi"))
    fireEvent.click(screen.getByText("Simpan", { selector: "button" }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const request = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string)
    expect(request.params.nightsMakkah).toBe(9)
    expect(request.manualOverrides.overrides.flight.idr).toBe(12_000_000)
    expect(request.expectedUpdatedAt).toBe("2026-07-12T00:00:00.000Z")
  })

  it("serializes a unit-price override as unitPrice and re-derives the value", async () => {
    render(
      <EstimatorClient
        pricingConfig={{} as PricingConfig}
        estimateId="e1"
        existingParams={params}
        existingOverrides={{ overrides: {}, customRows: [] }}
        savedAt="2026-07-12T00:00:00.000Z"
      />,
    )

    fireEvent.click(screen.getByText("unit flight")) // set unit price 8,000,000 (flight factor = 1)
    expect(screen.getByTestId("flight").textContent).toBe("8000000")
    expect(screen.getByTestId("flight-unit").textContent).toBe("8000000")

    fireEvent.click(screen.getByText("Perbarui Estimasi"))
    fireEvent.click(screen.getByText("Simpan", { selector: "button" }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const request = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string)
    expect(request.manualOverrides.overrides.flight.unitPrice).toBe(8_000_000)
    expect(request.manualOverrides.overrides.flight.idr).toBeUndefined()
  })

  it("a direct value edit supersedes a prior unit-price override", async () => {
    render(
      <EstimatorClient
        pricingConfig={{} as PricingConfig}
        estimateId="e1"
        existingParams={params}
        existingOverrides={{ overrides: {}, customRows: [] }}
        savedAt="2026-07-12T00:00:00.000Z"
      />,
    )

    fireEvent.click(screen.getByText("unit flight"))
    fireEvent.click(screen.getByText("override flight")) // direct value edit → clears unit price
    expect(screen.getByTestId("flight").textContent).toBe("12000000")

    fireEvent.click(screen.getByText("Perbarui Estimasi"))
    fireEvent.click(screen.getByText("Simpan", { selector: "button" }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const request = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string)
    expect(request.manualOverrides.overrides.flight.idr).toBe(12_000_000)
    expect(request.manualOverrides.overrides.flight.unitPrice).toBeUndefined()
  })

  it("a unit-price edit supersedes a prior value override and drops its stale baseline", async () => {
    render(
      <EstimatorClient
        pricingConfig={{} as PricingConfig}
        estimateId="e1"
        existingParams={params}
        existingOverrides={{ overrides: {}, customRows: [] }}
        savedAt="2026-07-12T00:00:00.000Z"
      />,
    )

    fireEvent.click(screen.getByText("override flight")) // sets idr + captures autoIdrAtOverride
    fireEvent.click(screen.getByText("unit flight")) // unit-price edit clears idr and its baseline
    expect(screen.getByTestId("flight").textContent).toBe("8000000")

    fireEvent.click(screen.getByText("Perbarui Estimasi"))
    fireEvent.click(screen.getByText("Simpan", { selector: "button" }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const request = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string)
    expect(request.manualOverrides.overrides.flight.unitPrice).toBe(8_000_000)
    expect(request.manualOverrides.overrides.flight.idr).toBeUndefined()
    expect(request.manualOverrides.overrides.flight.autoIdrAtOverride).toBeUndefined()
  })
})
