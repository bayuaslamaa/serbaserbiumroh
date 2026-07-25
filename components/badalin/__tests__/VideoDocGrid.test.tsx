import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { VideoDocGrid } from "../VideoDocGrid"
import { badalVideos } from "@/lib/badalin/content"

describe("VideoDocGrid", () => {
  it("renders one card per video with its title, duration and meta", () => {
    render(<VideoDocGrid />)

    for (const video of badalVideos) {
      expect(screen.getByText(video.title)).toBeDefined()
      expect(screen.getByText(video.duration)).toBeDefined()
      expect(screen.getByText(`${video.meta} · Tim Badalin`)).toBeDefined()
    }
  })

  it("mounts no iframe until a card is activated", () => {
    const { container } = render(<VideoDocGrid />)

    expect(container.querySelectorAll("iframe")).toHaveLength(0)
    expect(screen.getAllByRole("button", { name: /^Putar video:/ })).toHaveLength(
      badalVideos.length
    )
  })

  it("mounts exactly one iframe for the activated video", () => {
    const { container } = render(<VideoDocGrid />)

    fireEvent.click(
      screen.getByRole("button", { name: `Putar video: ${badalVideos[2].title}` })
    )

    const frames = container.querySelectorAll("iframe")
    expect(frames).toHaveLength(1)
    expect(frames[0].getAttribute("src")).toContain(badalVideos[2].youtubeId)
    expect(frames[0].getAttribute("src")).toContain("autoplay=1")
  })

  it("swaps the active card rather than stacking players", () => {
    const { container } = render(<VideoDocGrid />)

    fireEvent.click(
      screen.getByRole("button", { name: `Putar video: ${badalVideos[0].title}` })
    )
    fireEvent.click(
      screen.getByRole("button", { name: `Putar video: ${badalVideos[1].title}` })
    )

    const frames = container.querySelectorAll("iframe")
    expect(frames).toHaveLength(1)
    expect(frames[0].getAttribute("src")).toContain(badalVideos[1].youtubeId)
  })

  it("marks unfilled entries so placeholder video ids are visible on the page", () => {
    render(<VideoDocGrid />)

    const placeholders = badalVideos.filter((v) =>
      v.youtubeId.startsWith("VIDEO_ID_")
    )
    expect(screen.getAllByText("thumbnail menyusul")).toHaveLength(
      placeholders.length
    )
  })
})
