import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { BadalVideo } from "@/lib/badalin/content"

const fixture = vi.hoisted(() => ({
  videos: [
    {
      title: "Video siap tayang",
      duration: "12:40",
      meta: "Dokumentasi lengkap",
      youtubeId: "realId111",
    },
    {
      title: "Video kedua siap tayang",
      duration: "8:15",
      meta: "Miqat & niat",
      youtubeId: "realId222",
    },
    {
      title: "Video belum tayang",
      duration: "15:02",
      meta: "Tawaf",
      youtubeId: "VIDEO_ID_3",
    },
  ] as BadalVideo[],
}))

vi.mock("@/lib/badalin/content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/badalin/content")>()
  return { ...actual, badalVideos: fixture.videos }
})

import { VideoDocGrid } from "../VideoDocGrid"

describe("VideoDocGrid", () => {
  it("renders one card per video with its title and meta", () => {
    render(<VideoDocGrid />)

    for (const video of fixture.videos) {
      expect(screen.getByText(video.title)).toBeDefined()
      expect(screen.getByText(new RegExp(`${video.meta} · Tim Badalin`))).toBeDefined()
    }
  })

  it("mounts no iframe until a card is activated", () => {
    const { container } = render(<VideoDocGrid />)

    expect(container.querySelectorAll("iframe")).toHaveLength(0)
  })

  it("exposes a play control and a thumbnail only for videos with a real id", () => {
    const { container } = render(<VideoDocGrid />)

    const playButtons = screen.getAllByRole("button", { name: /^Putar video:/ })
    expect(playButtons).toHaveLength(2)
    expect(
      screen.getByRole("button", { name: "Putar video: Video siap tayang" })
    ).toBeDefined()

    const thumbs = container.querySelectorAll("img")
    expect(thumbs).toHaveLength(2)
    expect(thumbs[0].getAttribute("src")).toContain("realId111")
  })

  it("renders a placeholder video as an inert poster with no play control", () => {
    render(<VideoDocGrid />)

    expect(
      screen.queryByRole("button", { name: "Putar video: Video belum tayang" })
    ).toBeNull()
    expect(screen.getByText("Video segera tayang")).toBeDefined()
    expect(screen.getByText(/Tawaf · Tim Badalin · belum tayang/)).toBeDefined()
  })

  it("never advertises a duration for a video that cannot be played", () => {
    render(<VideoDocGrid />)

    expect(screen.getByText("12:40")).toBeDefined()
    expect(screen.queryByText("15:02")).toBeNull()
  })

  it("mounts exactly one iframe for the activated video", () => {
    const { container } = render(<VideoDocGrid />)

    fireEvent.click(
      screen.getByRole("button", { name: "Putar video: Video siap tayang" })
    )

    const frames = container.querySelectorAll("iframe")
    expect(frames).toHaveLength(1)
    expect(frames[0].getAttribute("src")).toContain("realId111")
    expect(frames[0].getAttribute("src")).toContain("autoplay=1")
  })

  it("swaps the active card rather than stacking players", () => {
    const { container } = render(<VideoDocGrid />)

    fireEvent.click(
      screen.getByRole("button", { name: "Putar video: Video siap tayang" })
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Putar video: Video kedua siap tayang" })
    )

    const frames = container.querySelectorAll("iframe")
    expect(frames).toHaveLength(1)
    expect(frames[0].getAttribute("src")).toContain("realId222")
  })
})

describe("badalin content placeholders", () => {
  it("flags every entry that still carries a placeholder id", async () => {
    // Guards the shipping state: while this is 9, /badalin advertises no
    // watchable video and the page copy must stay in "segera tayang" mode.
    const actual = await vi.importActual<typeof import("@/lib/badalin/content")>(
      "@/lib/badalin/content"
    )
    const unfilled = actual.badalVideos.filter((v) =>
      actual.isPlaceholderVideo(v.youtubeId)
    )

    expect(unfilled).toHaveLength(9)
  })
})
