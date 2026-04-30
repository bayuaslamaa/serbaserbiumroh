import { describe, it, expect } from "vitest"
import {
  exchangeRates,
  hotelPrices,
  airlinePrices,
  serviceFees,
  roomMultipliers,
  users,
  estimates,
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
    expect(cols).toContain("sarPerNight")
    expect(cols).toContain("label")
    expect(cols).toContain("sublabel")
  })

  it("airlinePrices table has expected columns", () => {
    const cols = Object.keys(airlinePrices)
    expect(cols).toContain("id")
    expect(cols).toContain("tier")
    expect(cols).toContain("idr")
    expect(cols).toContain("label")
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
})
