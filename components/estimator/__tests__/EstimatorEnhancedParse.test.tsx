import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BudgetBreakdown, EstimateParams, PricingConfig } from "@/types"

// U4 end to end through the client: the toggle owns a request option, the option reaches the route,
// and what the route says about it comes back to the operator.
//
// Deliberately a separate file from EstimatorClient.test.tsx, which mocks InputPanel away to isolate
// override orchestration. Here the real InputPanel is mounted, because the thing under test is the
// wiring between the checkbox and the request body — a mocked panel would assert nothing.

const routerPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }))
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }))
vi.mock("../SentenceCard", () => ({ SentenceCard: () => null }))
vi.mock("../ParamsPanel", () => ({ ParamsPanel: () => null }))
vi.mock("../BudgetBreakdown", () => ({ BudgetBreakdown: () => null }))
// Stubbed down to its save trigger rather than to null: one test below needs the save request body,
// and happy-dom's 1024px viewport puts the save button inside the rail.
vi.mock("../EstimatorRail", () => ({
  EstimatorRail: ({ onSave, saveLabel }: { onSave: () => void; saveLabel: string }) => (
    <button onClick={onSave}>{saveLabel}</button>
  ),
}))
vi.mock("../MobileTotalBar", () => ({ MobileTotalBar: () => null }))
vi.mock("../MobileWaPanel", () => ({ MobileWaPanel: () => null }))
vi.mock("@/lib/budget/calculate", () => ({
  calculateBudget: vi.fn((): BudgetBreakdown => breakdown),
}))

import { toast } from "@/hooks/use-toast"
import { EstimatorClient } from "../EstimatorClient"
import { ENHANCED_TOGGLE_LABEL } from "../InputPanel"

const detail = {
  label: "Hotel", tier: "STANDARD" as const, sarPerNight: 1, nights: 1,
  roomPax: 4, roomCount: 1, totalPax: 1, roomMultiplier: 1,
}

const breakdown: BudgetBreakdown = {
  hotelMadinahIdr: 4_000_000,
  hotelMakkahIdr: 8_000_000,
  hotelMadinahDetail: detail,
  hotelMakkahDetail: detail,
  servicesIdr: 0,
  serviceItems: [],
  flightIdr: 10_000_000,
  totalIdrPax: 22_000_000,
  totalIdrGrp: 22_000_000,
  sarRate: 4700,
  usdRate: 17300,
}

const parsedParams: EstimateParams = {
  nightsMadinah: 4,
  nightsMakkah: 8,
  pax: 2,
  hotelTier: "STANDARD",
  roomType: "DOUBLE",
  airline: "STANDARD",
  services: [],
  fullboard: true,
  travelMonth: 3,
  makkahHotelId: "olayan-ajyad",
}

const mockToast = toast as ReturnType<typeof vi.fn>

function okResponse(notes = "") {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue({ params: parsedParams, notes }) }
}

function errorResponse(status: number, error: string) {
  return { ok: false, status, json: vi.fn().mockResolvedValue({ error }) }
}

function renderEstimator(canUseEnhancedParse = true) {
  return render(
    <EstimatorClient pricingConfig={{} as PricingConfig} canUseEnhancedParse={canUseEnhancedParse} />,
  )
}

function typeStory(text = "umroh 12 hari maret double") {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } })
}

function toggle() {
  return screen.getByRole("checkbox", { name: ENHANCED_TOGGLE_LABEL }) as HTMLInputElement
}

async function parseRequestBody() {
  await waitFor(() => expect(fetch).toHaveBeenCalled())
  const call = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => url === "/api/estimate/parse")
  expect(call).toBeDefined()
  return JSON.parse(call![1].body as string) as { input: string; enhanced?: boolean }
}

describe("EstimatorClient enhanced-parse flag", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse()))
  })

  it("starts with the toggle off and sends no enhanced flag (R4 regression gate)", async () => {
    renderEstimator()

    // The default that matters: nothing has to be clicked for the cheap path to stay the path taken.
    expect(toggle().checked).toBe(false)

    typeStory()
    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))

    const body = await parseRequestBody()
    expect(body.enhanced).toBeUndefined()
    expect(Object.keys(body)).toEqual(["input"])
  })

  it("sends enhanced: true once the toggle is ticked", async () => {
    renderEstimator()
    typeStory()

    fireEvent.click(toggle())
    expect(toggle().checked).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))

    expect((await parseRequestBody()).enhanced).toBe(true)
  })

  it("drops back to no flag when the toggle is ticked and then unticked", async () => {
    renderEstimator()
    typeStory()

    fireEvent.click(toggle())
    fireEvent.click(toggle())
    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))

    expect((await parseRequestBody()).enhanced).toBeUndefined()
  })

  it("keeps the flag out of the reducer, so a saved estimate never carries it", async () => {
    // The flag is a request option. If it ever landed in the params the reducer holds, it would be
    // serialised on save — which is how a request setting quietly becomes part of the estimate.
    renderEstimator()
    typeStory()
    fireEvent.click(toggle())
    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))

    await waitFor(() => expect(screen.getByText(/Simpan Estimasi/)).toBeInTheDocument())
    fireEvent.click(screen.getByText("Simpan Estimasi"))
    fireEvent.click(screen.getByText("Simpan", { selector: "button" }))

    await waitFor(() =>
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(([url]) => url === "/api/estimate")).toBe(true),
    )
    const saveCall = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(([url]) => url === "/api/estimate")!
    const saved = JSON.parse(saveCall[1].body as string)
    expect(saved.enhanced).toBeUndefined()
    expect(saved.params.enhanced).toBeUndefined()
  })

  it("submits on ⌘/Ctrl+Enter with the toggle off and with it on", async () => {
    renderEstimator()
    typeStory()

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", metaKey: true })
    expect((await parseRequestBody()).enhanced).toBeUndefined()

    // Re-render rather than reuse: a successful parse hides the story panel.
    vi.clearAllMocks()
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(okResponse())
    renderEstimator()
    typeStory()
    fireEvent.click(toggle())
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", ctrlKey: true })
    expect((await parseRequestBody()).enhanced).toBe(true)
  })

  it("hides the toggle when the operator may not use the path", () => {
    // /estimate/[id] renders this component for the non-admin who owns the estimate, and
    // "Tulis ulang dari nol" reopens the parse panel there — hence the explicit capability.
    renderEstimator(false)

    expect(screen.queryByRole("checkbox")).toBeNull()
    expect(screen.queryByText(ENHANCED_TOGGLE_LABEL)).toBeNull()
  })

  it("cannot send the flag when the capability is withheld", async () => {
    renderEstimator(false)
    typeStory()
    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))

    expect((await parseRequestBody()).enhanced).toBeUndefined()
  })
})

describe("EstimatorClient renders enhanced provenance in the existing notes area (R5)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function parseWithNotes(notes: string) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(notes)))
    renderEstimator()
    typeStory()
    fireEvent.click(toggle())
    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))
    await waitFor(() => expect(screen.getByText(/Catatan:/)).toBeInTheDocument())
  }

  it("shows the rate and its source_label for an exact catalogue hit", async () => {
    const notes = "Makkah Olayan Ajyad: 1400 SAR/malam — tarif katalog DOUBLE bulan Maret. Sumber: Katalog Emaar 2027."
    await parseWithNotes(notes)

    // No new surface: the same "Catatan" block the estimator already showed carries the provenance.
    expect(screen.getByText(new RegExp("1400 SAR/malam"))).toBeInTheDocument()
    expect(screen.getByText(/Katalog Emaar 2027/)).toBeInTheDocument()
  })

  it("shows a QUAD fallback as a substitution, not as a bare rate (KTD4)", async () => {
    const notes =
      "Madinah Kayan Hotel: 620 SAR/malam — katalog tidak punya tarif DOUBLE bulan Maret, jadi tarif QUAD dipakai sebagai pengganti lalu disesuaikan ke DOUBLE. Ini bukan tarif DOUBLE asli dari katalog. Sumber: Katalog 1448H."
    await parseWithNotes(notes)

    const block = screen.getByText(/Catatan:/).parentElement!
    expect(block.textContent).toContain("pengganti")
    expect(block.textContent).toContain("bukan tarif DOUBLE asli")
    // The distinction an operator has to be able to make: a stand-in reads differently from a hit.
    expect(block.textContent).not.toContain("tarif katalog DOUBLE bulan")
  })
})

describe("EstimatorClient surfaces the enhanced path's refusals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function refuse(status: number, error: string) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(status, error)))
    renderEstimator()
    typeStory()
    fireEvent.click(toggle())
    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))
    await waitFor(() => expect(mockToast).toHaveBeenCalled())
    return mockToast.mock.calls.at(-1)![0] as { title: string; description: string; variant?: string }
  }

  it("turns the route's bare 403 Forbidden into something an operator can act on", async () => {
    const shown = await refuse(403, "Forbidden")

    expect(shown.title).toBe("Mode harga katalog tidak tersedia")
    expect(shown.description).not.toBe("Forbidden")
    expect(shown.description).toMatch(/admin/i)
    expect(shown.description).toMatch(/centang/i)
    expect(shown.variant).toBe("destructive")
  })

  it("passes the cap refusal through with its used/limit numbers intact", async () => {
    const capMessage = "Batas harga katalog harian tercapai (25/25). Pakai mode biasa atau coba lagi besok."
    const shown = await refuse(429, capMessage)

    expect(shown.title).toBe("Mode harga katalog tidak tersedia")
    // Passed through verbatim: the numbers are the whole content of a cap refusal.
    expect(shown.description).toBe(capMessage)
  })

  it("leaves the story panel open so the operator can retry without the toggle", async () => {
    await refuse(429, "Batas harga katalog harian tercapai (25/25).")

    expect(screen.getByRole("textbox")).toBeInTheDocument()
    expect(toggle()).toBeInTheDocument()
  })

  it("keeps the generic failure copy for a non-enhanced error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(503, "AI service unavailable")))
    renderEstimator()
    typeStory()
    fireEvent.click(screen.getByRole("button", { name: "Hitung Estimasi" }))

    await waitFor(() => expect(mockToast).toHaveBeenCalled())
    const shown = mockToast.mock.calls.at(-1)![0] as { title: string; description: string }
    expect(shown.title).toBe("Gagal menganalisis")
    expect(shown.description).toBe("AI service unavailable")
  })
})
