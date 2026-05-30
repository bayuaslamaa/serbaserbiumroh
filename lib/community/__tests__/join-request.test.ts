import { describe, expect, it } from "vitest"
import {
  normalizePhone,
  normalizeSocialUsername,
  parseCommunityJoinInput,
} from "@/lib/community/join-request"

describe("community join request helpers", () => {
  it("normalizes Indonesian phone numbers for matching", () => {
    expect(normalizePhone("0851-7211-7757")).toBe("6285172117757")
    expect(normalizePhone("85172117757")).toBe("6285172117757")
    expect(normalizePhone("+62 851 7211 7757")).toBe("6285172117757")
  })

  it("normalizes social usernames from handles and URLs", () => {
    expect(normalizeSocialUsername("@BayuAslama")).toBe("bayuaslama")
    expect(normalizeSocialUsername("https://instagram.com/BayuAslama/")).toBe("bayuaslama")
    expect(normalizeSocialUsername(" Bayu Aslama ")).toBe("bayuaslama")
  })

  it("parses minimal valid input", () => {
    const result = parseCommunityJoinInput({
      fullName: "  Bayu Aslama  ",
      phone: " 0851-7211-7757 ",
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toEqual({
      fullName: "Bayu Aslama",
      phone: "0851-7211-7757",
      normalizedPhone: "6285172117757",
      socialUsername: null,
      normalizedSocialUsername: null,
      intent: null,
    })
  })

  it("keeps optional social username and intent when provided", () => {
    const result = parseCommunityJoinInput({
      fullName: "Aisyah",
      phone: "+62 812 0000 1111",
      socialUsername: "@aisyah.umroh",
      intent: "Mau belajar umroh mandiri",
    })

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.socialUsername).toBe("@aisyah.umroh")
    expect(result.data.normalizedSocialUsername).toBe("aisyah.umroh")
    expect(result.data.intent).toBe("Mau belajar umroh mandiri")
  })

  it("rejects missing required fields", () => {
    expect(parseCommunityJoinInput({ phone: "0851" })).toEqual({
      success: false,
      error: "Nama lengkap wajib diisi",
    })
    expect(parseCommunityJoinInput({ fullName: "Bayu" })).toEqual({
      success: false,
      error: "Nomor HP wajib diisi",
    })
  })

  it("rejects phone values that are too short after normalization", () => {
    expect(parseCommunityJoinInput({ fullName: "Bayu", phone: "123" })).toEqual({
      success: false,
      error: "Nomor HP belum valid",
    })
  })
})
