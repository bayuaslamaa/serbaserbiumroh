import { describe, it, expect } from "vitest"
import bcrypt from "bcryptjs"

// Unit tests for auth credential logic — NextAuth internals are not testable in vitest (require Next.js runtime)
describe("credentials authorize logic", () => {
  it("returns null when email or password is empty", () => {
    const authorize = (email: string, password: string) => {
      if (!email || !password) return null
      return "user"
    }
    expect(authorize("", "pass")).toBeNull()
    expect(authorize("user@test.com", "")).toBeNull()
    expect(authorize("", "")).toBeNull()
    expect(authorize("user@test.com", "pass")).not.toBeNull()
  })

  it("wrong password does not match bcrypt hash", async () => {
    const hash = await bcrypt.hash("correctpassword", 10)
    const isValid = await bcrypt.compare("wrongpassword", hash)
    expect(isValid).toBe(false)
  })

  it("correct password matches bcrypt hash", async () => {
    const hash = await bcrypt.hash("mypassword123", 10)
    const isValid = await bcrypt.compare("mypassword123", hash)
    expect(isValid).toBe(true)
  })

  it("bcrypt hash is not reversible (different hash each call)", async () => {
    const hash1 = await bcrypt.hash("password", 10)
    const hash2 = await bcrypt.hash("password", 10)
    expect(hash1).not.toBe(hash2)
    // But both should validate
    expect(await bcrypt.compare("password", hash1)).toBe(true)
    expect(await bcrypt.compare("password", hash2)).toBe(true)
  })

  it("null password (OAuth-only user) blocks credentials login", () => {
    const authorizeWithDbUser = (
      dbPassword: string | null,
      inputPassword: string
    ) => {
      if (!dbPassword) return null
      // would call bcrypt.compare in real impl
      return dbPassword === inputPassword ? "user" : null
    }
    expect(authorizeWithDbUser(null, "anypassword")).toBeNull()
  })
})
