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
  activityLogs,
  communityJoinRequests,
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
    expect(cols).toContain("distance")
    expect(cols).toContain("agodaUrl")
    expect(cols).toContain("bookingcomUrl")
    expect(cols).toContain("tripcomUrl")
    expect(cols).toContain("bookingUrl")
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

  it("activityLogs table has generic logging columns", () => {
    const cols = Object.keys(activityLogs)
    expect(cols).toContain("userId")
    expect(cols).toContain("flow")
    expect(cols).toContain("event")
    expect(cols).toContain("status")
    expect(cols).toContain("entityType")
    expect(cols).toContain("entityId")
    expect(cols).toContain("input")
    expect(cols).toContain("output")
    expect(cols).toContain("error")
    expect(cols).toContain("metadata")
  })

  it("communityJoinRequests table has review and matching columns", () => {
    const cols = Object.keys(communityJoinRequests)
    expect(cols).toContain("id")
    expect(cols).toContain("userId")
    expect(cols).toContain("fullName")
    expect(cols).toContain("phone")
    expect(cols).toContain("normalizedPhone")
    expect(cols).toContain("socialUsername")
    expect(cols).toContain("normalizedSocialUsername")
    expect(cols).toContain("intent")
    expect(cols).toContain("status")
    expect(cols).toContain("adminNote")
    expect(cols).toContain("createdAt")
    expect(cols).toContain("updatedAt")
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
