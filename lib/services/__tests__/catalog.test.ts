import { describe, expect, it } from "vitest"
import { badalinPrice, badalinPriceShort } from "@/lib/badalin/content"
import {
  SSU_WHATSAPP_NUMBER,
  isExternalHref,
  services,
  whatsappHref,
} from "../catalog"

describe("service catalog", () => {
  it("contains exactly six services", () => {
    expect(services).toHaveLength(6)
  })

  it("gives every service a non-empty name, description, price and href", () => {
    for (const service of services) {
      expect(service.name.length).toBeGreaterThan(0)
      expect(service.description.length).toBeGreaterThan(0)
      expect(service.price.length).toBeGreaterThan(0)
      expect(service.href.length).toBeGreaterThan(0)
    }
  })

  it("pins the customer-facing price line for every service", () => {
    // Pinned here, in the data module's own test, so a wrong or typo'd price
    // fails loudly. The render tests read these values from the catalog, so
    // they cannot catch a wrong figure — this is the guard that can.
    expect(Object.fromEntries(services.map((s) => [s.id, s.price]))).toEqual({
      visa: "Mulai USD 165",
      badalin: "Mulai Rp 1,8 jt",
      transportasi: "Mulai SAR 170",
      hotel: "Mulai Rp 900 rb/malam",
      hhr: "+Rp 100 rb/orang (tidak termasuk tiket)",
      muthowwif: "Mulai Rp 1,4 jt/sesi",
    })
  })

  it("quotes every price in a named currency", () => {
    for (const service of services) {
      expect(service.price, `${service.id} price`).toMatch(/\b(Rp|USD|SAR)\b/)
    }
  })

  it("keeps the Badalin card and the /badalin hero on one figure", () => {
    const badalin = services.find((s) => s.id === "badalin")!

    expect(badalin.price).toContain(badalinPriceShort)
    expect(badalinPrice).toContain("1,8")
    expect(badalinPriceShort).toContain("1,8")
  })

  it("uses unique ids", () => {
    const ids = services.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("marks Badalin as the only new service and points it at /badalin", () => {
    const isNew = services.filter((s) => s.isNew)

    expect(isNew).toHaveLength(1)
    expect(isNew[0].id).toBe("badalin")
    expect(isNew[0].href).toBe("/badalin")
  })

  it("routes services that already have a page to their internal route", () => {
    const byId = Object.fromEntries(services.map((s) => [s.id, s]))

    expect(byId.visa.href).toBe("/visa")
    expect(byId.transportasi.href).toBe("/transportasi")
    expect(byId.hotel.href).toBe("/hotel-nusuk")
  })

  it("routes services without a page to WhatsApp with a service-specific message", () => {
    const byId = Object.fromEntries(services.map((s) => [s.id, s]))

    for (const id of ["hhr", "muthowwif"]) {
      expect(byId[id].href).toContain(`https://wa.me/${SSU_WHATSAPP_NUMBER}`)
      expect(isExternalHref(byId[id].href)).toBe(true)
    }

    expect(decodeURIComponent(byId.hhr.href)).toContain("Haramain")
    expect(decodeURIComponent(byId.muthowwif.href)).toContain("muthowwif")
  })

  it("gives every service a defined icon component", () => {
    for (const service of services) {
      expect(service.icon).toBeDefined()
      expect(typeof service.icon).not.toBe("string")
    }
  })

  it("url-encodes the WhatsApp message", () => {
    const href = whatsappHref("halo dunia & teman")

    expect(href).toBe(
      `https://wa.me/${SSU_WHATSAPP_NUMBER}?text=halo%20dunia%20%26%20teman`
    )
  })

  it("treats internal routes as non-external", () => {
    expect(isExternalHref("/visa")).toBe(false)
  })
})
