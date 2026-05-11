import { describe, it, expect } from "vitest"
import {
  exchangeRates,
  hotelPrices,
  airlinePrices,
  airlineMonthlyPrices,
  serviceFees,
  roomMultipliers,
  users,
  estimates,
  pilgrimStories,
  storyItineraryDays,
  hotelListings,
  faqGroups,
  faqItems,
} from "@/lib/db/schema"

describe("schema table definitions", () => {
  it("exchangeRates table has expected columns", () => {
    const cols = Object.keys(exchangeRates)
    expect(cols).toContain("id")
    expect(cols).toContain("currency")
    expect(cols).toContain("rateToIdr")
    expect(cols).toContain("updatedBy")
    expect(cols).toContain("updatedAt")
  })

  it("hotelPrices table has expected columns", () => {
    const cols = Object.keys(hotelPrices)
    expect(cols).toContain("id")
    expect(cols).toContain("city")
    expect(cols).toContain("tier")
    expect(cols).toContain("importKey")
    expect(cols).toContain("sarPerNight")
    expect(cols).toContain("label")
    expect(cols).toContain("sublabel")
  })

  it("airlinePrices table has expected columns", () => {
    const cols = Object.keys(airlinePrices)
    expect(cols).toContain("id")
    expect(cols).toContain("tier")
    expect(cols).toContain("importKey")
    expect(cols).toContain("idr")
    expect(cols).toContain("label")
    expect(cols).toContain("isDefault")
  })

  it("airlineMonthlyPrices table has expected columns", () => {
    const cols = Object.keys(airlineMonthlyPrices)
    expect(cols).toContain("id")
    expect(cols).toContain("airlinePriceId")
    expect(cols).toContain("month")
    expect(cols).toContain("idr")
  })

  it("serviceFees table has expected columns including enabled flag", () => {
    const cols = Object.keys(serviceFees)
    expect(cols).toContain("key")
    expect(cols).toContain("currency")
    expect(cols).toContain("amount")
    expect(cols).toContain("enabled")
  })

  it("roomMultipliers table has expected columns", () => {
    const cols = Object.keys(roomMultipliers)
    expect(cols).toContain("type")
    expect(cols).toContain("paxPerRoom")
    expect(cols).toContain("multiplier")
  })

  it("users table has password and role columns", () => {
    const cols = Object.keys(users)
    expect(cols).toContain("password")
    expect(cols).toContain("role")
    expect(cols).toContain("email")
  })

  it("estimates table has params and total columns", () => {
    const cols = Object.keys(estimates)
    expect(cols).toContain("params")
    expect(cols).toContain("totalIdrPax")
    expect(cols).toContain("totalIdrGrp")
    expect(cols).toContain("rawInput")
    expect(cols).toContain("userId")
  })

  it("pilgrimStories table has expected columns", () => {
    const cols = Object.keys(pilgrimStories)
    expect(cols).toContain("id")
    expect(cols).toContain("slug")
    expect(cols).toContain("authorName")
    expect(cols).toContain("pax")
    expect(cols).toContain("hotelTier")
    expect(cols).toContain("isPublished")
    expect(cols).toContain("isFeatured")
  })

  it("storyItineraryDays table has storyId field", () => {
    const cols = Object.keys(storyItineraryDays)
    expect(cols).toContain("storyId")
    expect(cols).toContain("dayNumber")
    expect(cols).toContain("label")
  })

  it("hotelListings table has city and tier fields", () => {
    const cols = Object.keys(hotelListings)
    expect(cols).toContain("city")
    expect(cols).toContain("tier")
    expect(cols).toContain("slug")
    expect(cols).toContain("name")
  })

  it("faqGroups table has ordering fields", () => {
    const cols = Object.keys(faqGroups)
    expect(cols).toContain("id")
    expect(cols).toContain("name")
    expect(cols).toContain("sortOrder")
    expect(cols).toContain("createdAt")
  })

  it("faqItems table has group, rich answer, ordering, and publish fields", () => {
    const cols = Object.keys(faqItems)
    expect(cols).toContain("id")
    expect(cols).toContain("groupId")
    expect(cols).toContain("question")
    expect(cols).toContain("answer")
    expect(cols).toContain("sortOrder")
    expect(cols).toContain("isPublished")
  })
})
