import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/hotels/detail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/hotels/detail")>()
  return { ...actual, getHotelDetailBySlug: vi.fn(), getAllHotelSlugs: vi.fn() }
})

const notFoundError = new Error("NEXT_NOT_FOUND")
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError
  }),
}))

import { getAllHotelSlugs, getHotelDetailBySlug, type HotelDetail } from "@/lib/hotels/detail"
import { buildMonthlyPrices } from "@/lib/hotels/pricing"
import HotelDetailPage, { generateMetadata, generateStaticParams } from "../page"

const mockDetail = getHotelDetailBySlug as ReturnType<typeof vi.fn>
const mockSlugs = getAllHotelSlugs as ReturnType<typeof vi.fn>

function hotel(overrides: Partial<HotelDetail> = {}): HotelDetail {
  return {
    id: "hotel-1",
    slug: "safwa-tower-3",
    city: "MAKKAH",
    tier: "STANDARD",
    label: "Safwa Tower 3",
    sublabel: "3★, dekat Haram",
    distance: "250m jalan kaki",
    sarPerNight: 1300,
    agodaUrl: "https://www.agoda.com/safwa-tower-3",
    bookingcomUrl: null,
    tripcomUrl: null,
    bookingUrl: null,
    monthlyPrices: buildMonthlyPrices(1300, { 3: 2600 }, 4700),
    exchangeRate: 4700,
    editorial: null,
    ...overrides,
  }
}

afterEach(() => {
  mockDetail.mockReset()
  mockSlugs.mockReset()
})

describe("HotelDetailPage", () => {
  const params = Promise.resolve({ slug: "safwa-tower-3" })

  it("renders the hotel name, city, tier, and distance", async () => {
    mockDetail.mockResolvedValue(hotel())

    render(await HotelDetailPage({ params }))

    expect(screen.getByRole("heading", { level: 1, name: "Safwa Tower 3" })).toBeDefined()
    expect(screen.getByText("MAKKAH")).toBeDefined()
    expect(screen.getByText("Standar")).toBeDefined()
    expect(screen.getByText("250m jalan kaki")).toBeDefined()
  })

  it("renders all twelve months of prices in both currencies", async () => {
    mockDetail.mockResolvedValue(hotel())

    const { container } = render(await HotelDetailPage({ params }))

    const rows = container.querySelectorAll("tbody tr")
    expect(rows).toHaveLength(12)
    expect(screen.getByText("Januari")).toBeDefined()
    expect(screen.getByText("Desember")).toBeDefined()
    // March carries a seasonal override of 2600 SAR.
    expect(screen.getByText("2600")).toBeDefined()
  })

  it("calls notFound for an unknown slug instead of throwing a raw error", async () => {
    mockDetail.mockResolvedValue(null)

    await expect(
      HotelDetailPage({ params: Promise.resolve({ slug: "tidak-ada" }) }),
    ).rejects.toBe(notFoundError)
  })

  it("renders fully for a hotel with no editorial overlay", async () => {
    mockDetail.mockResolvedValue(hotel({ editorial: null }))

    render(await HotelDetailPage({ params }))

    expect(screen.getByRole("heading", { level: 1, name: "Safwa Tower 3" })).toBeDefined()
    expect(screen.queryByText("Catatan untuk Jamaah")).toBeNull()
  })

  it("shows pilgrim notes when an editorial overlay exists", async () => {
    mockDetail.mockResolvedValue(
      hotel({
        editorial: {
          facilities: "Lift, restoran, laundry",
          pilgrimNotes: "Pintu keluar tercepat ke Haram lewat basement.",
        },
      }),
    )

    render(await HotelDetailPage({ params }))

    expect(screen.getByText("Catatan untuk Jamaah")).toBeDefined()
    expect(screen.getByText(/Pintu keluar tercepat/)).toBeDefined()
    expect(screen.getByText(/Lift, restoran, laundry/)).toBeDefined()
  })

  it("emits a three-step BreadcrumbList and no Hotel or Offer schema", async () => {
    mockDetail.mockResolvedValue(hotel())

    const { container } = render(await HotelDetailPage({ params }))
    const blocks = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
    const schemas = blocks.map((b) => JSON.parse(b.innerHTML))

    const breadcrumb = schemas.find((s) => s["@type"] === "BreadcrumbList")
    expect(breadcrumb.itemListElement).toHaveLength(3)
    expect(breadcrumb.itemListElement[2].item).toContain("/hotel-nusuk/safwa-tower-3")
    // These estimates are not bookable offers, and SSU is not the provider.
    expect(schemas.some((s) => s["@type"] === "Hotel" || s["@type"] === "Offer")).toBe(false)
  })

  it("omits the booking section when the hotel has no booking links", async () => {
    mockDetail.mockResolvedValue(hotel({ agodaUrl: null }))

    render(await HotelDetailPage({ params }))

    expect(screen.queryByText("Cek Ketersediaan")).toBeNull()
  })
})

describe("generateMetadata", () => {
  const params = Promise.resolve({ slug: "safwa-tower-3" })

  it("builds a title and description from this hotel's own facts", async () => {
    mockDetail.mockResolvedValue(hotel())

    const meta = await generateMetadata({ params })

    expect(meta.title).toContain("Safwa Tower 3")
    expect(meta.title).toContain("Makkah")
    expect(meta.description).toContain("250m jalan kaki")
    expect(meta.description).toContain("Masjidil Haram")
  })

  it("gives two different hotels genuinely different descriptions", async () => {
    mockDetail.mockResolvedValueOnce(hotel())
    const first = await generateMetadata({ params })

    mockDetail.mockResolvedValueOnce(
      hotel({
        label: "Anwar Al Madinah",
        city: "MADINAH",
        tier: "PREMIUM",
        distance: "100m",
        monthlyPrices: buildMonthlyPrices(3000, {}, 4700),
      }),
    )
    const second = await generateMetadata({ params: Promise.resolve({ slug: "anwar-al-madinah" }) })

    expect(second.description).not.toBe(first.description)
    expect(second.title).not.toBe(first.title)
  })

  it("declares a canonical containing the slug", async () => {
    mockDetail.mockResolvedValue(hotel())

    const meta = await generateMetadata({ params })

    expect(meta.alternates?.canonical).toBe("/hotel-nusuk/safwa-tower-3")
  })

  it("returns empty metadata for an unknown slug without throwing", async () => {
    mockDetail.mockResolvedValue(null)

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: "tidak-ada" }) }),
    ).resolves.toEqual({})
  })
})

describe("generateStaticParams", () => {
  it("returns one entry per slug", async () => {
    mockSlugs.mockResolvedValue(["safwa-tower-3", "anwar-al-madinah"])

    expect(await generateStaticParams()).toEqual([
      { slug: "safwa-tower-3" },
      { slug: "anwar-al-madinah" },
    ])
  })

  it("returns an empty list when no slugs are available, so the build still succeeds", async () => {
    mockSlugs.mockResolvedValue([])

    expect(await generateStaticParams()).toEqual([])
  })
})
