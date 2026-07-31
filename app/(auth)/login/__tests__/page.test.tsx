import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockPush = vi.fn()
const mockRefresh = vi.fn()
const mockSignIn = vi.fn()
let currentParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh, replace: vi.fn() }),
  useSearchParams: () => currentParams,
}))

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

import LoginPage from "../page"

beforeEach(() => {
  currentParams = new URLSearchParams()
  mockPush.mockClear()
  mockRefresh.mockClear()
  mockSignIn.mockReset()
  mockSignIn.mockResolvedValue({ error: null })
})

/**
 * Signs in successfully and reports where the page navigated afterwards.
 * The destination comes from `?callbackUrl=`, which is attacker-controllable:
 * anyone can hand a victim a link to the genuine login page.
 */
async function loginAndGetDestination(callbackUrl?: string) {
  if (callbackUrl !== undefined) {
    currentParams = new URLSearchParams({ callbackUrl })
  }

  render(<LoginPage />)

  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "user@example.com" } })
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } })
  fireEvent.click(screen.getByRole("button", { name: "Masuk" }))

  await waitFor(() => expect(mockPush).toHaveBeenCalled())
  return mockPush.mock.calls[0][0]
}

describe("LoginPage callbackUrl handling", () => {
  it("defaults to the dashboard when no callback is given", async () => {
    expect(await loginAndGetDestination()).toBe("/dashboard")
  })

  it("follows a same-site path", async () => {
    expect(await loginAndGetDestination("/webinar-umroh-mandiri")).toBe("/webinar-umroh-mandiri")
  })

  // router.push hands a `javascript:` URL to location.assign unchanged -- Next's
  // navigate-reducer passes url.toString(), not createHrefFromUrl(url), so the
  // scheme survives and the script runs on our own origin.
  it("refuses a javascript: URL", async () => {
    expect(await loginAndGetDestination("javascript:alert(1)")).toBe("/dashboard")
  })

  // Starts with "/" but is protocol-relative, so it resolves to a foreign host.
  it("refuses a protocol-relative URL", async () => {
    expect(await loginAndGetDestination("//evil.example")).toBe("/dashboard")
  })

  it("refuses an absolute off-site URL", async () => {
    expect(await loginAndGetDestination("https://evil.example")).toBe("/dashboard")
  })
})
