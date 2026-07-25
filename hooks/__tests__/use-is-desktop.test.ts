// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest"
import { act, renderHook, cleanup } from "@testing-library/react"
import { useIsDesktop } from "@/hooks/use-is-desktop"

function setInnerWidth(width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event("resize"))
}

describe("useIsDesktop", () => {
  afterEach(() => {
    cleanup()
    window.innerWidth = 1024
  })

  it("returns true at innerWidth = 1200", () => {
    window.innerWidth = 1200
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it("returns true at the boundary innerWidth = 1024", () => {
    window.innerWidth = 1024
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it("returns false after a simulated resize to innerWidth = 800", () => {
    window.innerWidth = 1200
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)

    act(() => {
      setInnerWidth(800)
    })
    expect(result.current).toBe(false)
  })

  it("removes its resize listener on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener")
    const removeSpy = vi.spyOn(window, "removeEventListener")

    const { unmount } = renderHook(() => useIsDesktop())
    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function))
    const handler = addSpy.mock.calls.find(([event]) => event === "resize")?.[1]

    unmount()
    expect(removeSpy).toHaveBeenCalledWith("resize", handler)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
