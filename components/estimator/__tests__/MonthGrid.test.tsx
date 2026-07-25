import { fireEvent, render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MonthGrid } from "../MonthGrid"

describe("MonthGrid", () => {
  it("renders a responsive grid: 3 columns narrow, 4 at sm:, 6 at md:+", () => {
    render(<MonthGrid value={undefined} onChange={vi.fn()} />)

    const grid = screen.getByText("Jan").parentElement
    expect(grid?.className).toContain("grid-cols-3")
    expect(grid?.className).toContain("sm:grid-cols-4")
    expect(grid?.className).toContain("md:grid-cols-6")
  })

  it("renders all 12 month labels", () => {
    render(<MonthGrid value={undefined} onChange={vi.fn()} />)

    for (const label of ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]) {
      expect(screen.getByText(label)).toBeDefined()
    }
  })

  it("calls onChange with the 1-indexed month when an unselected month is clicked", () => {
    const onChange = vi.fn()
    render(<MonthGrid value={undefined} onChange={onChange} />)

    fireEvent.click(screen.getByText("Nov"))

    expect(onChange).toHaveBeenCalledWith(11)
  })

  it("calls onChange with undefined when the already-selected month is clicked again", () => {
    const onChange = vi.fn()
    render(<MonthGrid value={11} onChange={onChange} />)

    fireEvent.click(screen.getByText("Nov"))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("marks the selected month as aria-pressed", () => {
    render(<MonthGrid value={11} onChange={vi.fn()} />)

    expect(screen.getByText("Nov").getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByText("Jan").getAttribute("aria-pressed")).toBe("false")
  })
})
