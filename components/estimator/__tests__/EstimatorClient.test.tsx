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
// SentenceCard is the new default view; it needs real hotel/airline/service data from
// pricingConfig to render its chips, but this suite passes a minimal `{} as PricingConfig`
// stub since it only exercises override orchestration, not the narrative UI (covered by
// SentenceCard.test.tsx). Mock it out like every other rendered child in this file.
vi.mock("../SentenceCard", () => ({ SentenceCard: () => null }))
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

    // ParamsPanel (mocked above) only mounts behind the "Buka form lengkap" toggle now that
    // SentenceCard is the default view — reach it the same way a real user would.
    fireEvent.click(screen.getByText("Buka form lengkap"))
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

describe("EstimatorClient seeded from a stored estimate naming a retired service key", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn().mockResolvedValue({}) }))
  })

  it("posts back the legs, not the retired key, so the save is not rejected", async () => {
    // The reducer seeds straight from existingParams and sends that snapshot on save. Guarding
    // only the pricing boundary would leave this request carrying TRANSPORT, and the API would
    // answer 400 on an estimate that had just displayed a correct total.
    render(
      <EstimatorClient
        pricingConfig={{} as PricingConfig}
        estimateId="e1"
        existingParams={{ ...params, services: ["VISA", "TRANSPORT"] } as unknown as EstimateParams}
        existingOverrides={{ overrides: { "service:TRANSPORT": { unitPrice: 650 } }, customRows: [] }}
        savedAt="2026-07-12T00:00:00.000Z"
      />,
    )

    // Touch an override so the whole map is sent too, not just the params.
    fireEvent.click(screen.getByText("override flight"))
    fireEvent.click(screen.getByText("Perbarui Estimasi"))
    fireEvent.click(screen.getByText("Simpan", { selector: "button" }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    const request = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string)
    expect(request.params.services).toEqual([
      "VISA",
      "TRANSPORT_JED_MAKKAH",
      "TRANSPORT_MAKKAH_MADINAH",
      "TRANSPORT_MADINAH_JED",
    ])
    expect(request.manualOverrides.overrides["service:TRANSPORT"]).toBeUndefined()
    expect(request.manualOverrides.overrides["service:TRANSPORT_JED_MAKKAH"]).toEqual({ unitPrice: 650 })
  })

  it("leaves the stored override column alone when nothing is edited", () => {
    // The seed is normalised, so the remap must not read as a user edit — otherwise every legacy
    // estimate would rewrite its own override column just by being opened.
    render(
      <EstimatorClient
        pricingConfig={{} as PricingConfig}
        estimateId="e1"
        existingParams={{ ...params, services: ["VISA", "TRANSPORT"] } as unknown as EstimateParams}
        existingOverrides={{ overrides: { "service:TRANSPORT": { unitPrice: 650 } }, customRows: [] }}
        savedAt="2026-07-12T00:00:00.000Z"
      />,
    )

    fireEvent.click(screen.getByText("Perbarui Estimasi"))
    fireEvent.click(screen.getByText("Simpan", { selector: "button" }))

    const request = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string)
    expect(request.manualOverrides).toBeUndefined()
  })
})
