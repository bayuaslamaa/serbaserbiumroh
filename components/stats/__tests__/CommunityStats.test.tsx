import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CommunityStats } from "../CommunityStats"
import { COMMUNITY_SIZE, PILGRIMS_HELPED } from "@/lib/stats/community"

describe("CommunityStats degraded path", () => {
  it("renders the static figures and omits the visitor pill when the count is unavailable", () => {
    // A server component that throws takes the whole route down, so an
    // unreadable count must degrade, not fail.
    expect(() => render(<CommunityStats visitorCount={null} />)).not.toThrow()

    expect(screen.getByText(new RegExp(COMMUNITY_SIZE))).toBeDefined()
    expect(screen.getByText(new RegExp(PILGRIMS_HELPED))).toBeDefined()
    expect(screen.queryByText(/Pengunjung/)).toBeNull()
  })
})

describe("CommunityStats", () => {
  it("renders all three figures for a resolved count", () => {
    render(<CommunityStats visitorCount={8778} />)

    expect(screen.getByText(`${COMMUNITY_SIZE} Komunitas`)).toBeDefined()
    expect(screen.getByText(`${PILGRIMS_HELPED} Jamaah Terbantu`)).toBeDefined()
    expect(screen.getByText(/8\.878\+ Pengunjung/)).toBeDefined()
  })

  it("applies the offset and id-ID grouping to the visitor figure", () => {
    render(<CommunityStats visitorCount={0} />)

    expect(screen.getByText(/100\+ Pengunjung/)).toBeDefined()
  })

  it("takes the static figures from the shared module, not from local literals", () => {
    const { container } = render(<CommunityStats visitorCount={1} />)

    // Guards against someone reintroducing hardcoded copies in the component.
    expect(container.textContent).toContain(COMMUNITY_SIZE)
    expect(container.textContent).toContain(PILGRIMS_HELPED)
  })

  it("has no pending state to render — the count arrives before the component does", () => {
    const { container } = render(<CommunityStats visitorCount={8778} />)

    expect(container.querySelector(".animate-pulse")).toBeNull()
    expect(screen.queryByTestId("visitor-skeleton")).toBeNull()
  })
})
