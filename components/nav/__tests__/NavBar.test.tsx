import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

// Mock @/auth before importing NavBar
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}))

import { auth } from "@/auth"
import { NavBar } from "../NavBar"

const mockAuth = auth as ReturnType<typeof vi.fn>

describe("NavBar", () => {
  it("renders Panduan link when session is null", async () => {
    mockAuth.mockResolvedValue(null)
    render(await NavBar({}))
    expect(screen.getByRole("link", { name: "Panduan" })).toBeDefined()
  })

  it("renders Cerita Jamaah link when session is null", async () => {
    mockAuth.mockResolvedValue(null)
    render(await NavBar({}))
    expect(screen.getByRole("link", { name: "Cerita Jamaah" })).toBeDefined()
  })

  it("renders Hotel Nusuk link when session is null", async () => {
    mockAuth.mockResolvedValue(null)
    render(await NavBar({}))
    expect(screen.getByRole("link", { name: "Hotel Nusuk" })).toBeDefined()
  })

  it("renders FAQ link when session is null", async () => {
    mockAuth.mockResolvedValue(null)
    render(await NavBar({}))
    expect(screen.getByRole("link", { name: "FAQ" })).toBeDefined()
  })

  it("renders without crashing when session is null (unauthenticated)", async () => {
    mockAuth.mockResolvedValue(null)
    render(await NavBar({}))
    expect(screen.getByRole("navigation")).toBeDefined()
  })

  it("renders Dashboard link when user is authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { email: "test@example.com", role: "USER" },
    })
    render(await NavBar({}))
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeDefined()
  })
})
