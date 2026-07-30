import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// The gate this page already had (U4 asserts it still holds rather than re-implementing it): the
// whole estimator — and therefore the enhanced-parse toggle inside it — is ADMIN only here.
//
// The toggle's own capability prop is asserted too, because /estimate/[id] renders the same client
// for a non-admin owner. If this page ever stopped passing the flag, or started passing it
// unconditionally, the toggle would be the thing that silently changed.

vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: {} }))
vi.mock("@/lib/budget/calculate", () => ({ fetchPricingConfig: vi.fn() }))

// Recorded rather than rendered: this test is about what the page decides to hand the client, and
// the client's own behaviour is covered by its component suites.
const estimatorProps = vi.fn()
vi.mock("@/components/estimator/EstimatorClient", () => ({
  EstimatorClient: (props: Record<string, unknown>) => {
    estimatorProps(props)
    return <div data-testid="estimator" />
  },
}))

import { requireAuth } from "@/lib/auth"
import { fetchPricingConfig } from "@/lib/budget/calculate"
import NewEstimatePage from "../page"

const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>
const mockFetchPricingConfig = fetchPricingConfig as ReturnType<typeof vi.fn>

function signIn(role: "ADMIN" | "USER") {
  mockRequireAuth.mockResolvedValue({ user: { id: "u1", role } })
}

describe("/estimate/new gates the estimator on ADMIN", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchPricingConfig.mockResolvedValue({})
  })

  it("shows the coming-soon placeholder and no estimator for a non-admin", async () => {
    signIn("USER")

    render(await NewEstimatePage({ searchParams: {} }))

    expect(screen.getByText("Fitur Estimasi Biaya Segera Hadir")).toBeInTheDocument()
    expect(screen.queryByTestId("estimator")).toBeNull()
    expect(estimatorProps).not.toHaveBeenCalled()
    // The pricing read is behind the gate too, so a refused visit costs no query.
    expect(mockFetchPricingConfig).not.toHaveBeenCalled()
  })

  it("mounts the estimator with the enhanced-parse capability for an admin", async () => {
    signIn("ADMIN")

    render(await NewEstimatePage({ searchParams: {} }))

    expect(screen.getByTestId("estimator")).toBeInTheDocument()
    expect(estimatorProps).toHaveBeenCalledWith(
      expect.objectContaining({ canUseEnhancedParse: true }),
    )
  })
})
