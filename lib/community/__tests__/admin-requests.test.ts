import { beforeEach, describe, expect, it, vi } from "vitest"

const groupByResults = {
  phones: [] as { value: string }[],
  socials: [] as { value: string | null }[],
}

type RecordedQuery = { column: string; having: unknown; where: unknown }

const recordedQueries: RecordedQuery[] = []

vi.mock("@/lib/db", () => {
  // Each db.select() call returns a fresh chainable builder. The builder is
  // thenable so `await`ing the chain resolves to whichever fixture the test
  // queued -- which query it is comes from the groupBy column.
  //
  // The predicates handed to .where()/.having() are recorded rather than
  // discarded: they are the entire point of the aggregate, so a mock that
  // swallows them would stay green if the HAVING clause were dropped.
  const makeBuilder = () => {
    const record: RecordedQuery = { column: "", having: undefined, where: undefined }
    recordedQueries.push(record)

    const builder: Record<string, unknown> = {
      from: vi.fn(() => builder),
      where: vi.fn((condition: unknown) => {
        record.where = condition
        return builder
      }),
      having: vi.fn((condition: unknown) => {
        record.having = condition
        return builder
      }),
      groupBy: vi.fn((col: string) => {
        record.column = col
        return builder
      }),
      then: (resolve: (rows: unknown) => unknown) =>
        Promise.resolve(
          record.column === "community_join_requests.normalized_phone"
            ? groupByResults.phones
            : groupByResults.socials
        ).then(resolve),
    }
    return builder
  }

  return { db: { select: vi.fn(() => makeBuilder()) } }
})

vi.mock("drizzle-orm", () => ({
  count: vi.fn(() => "COUNT(*)"),
  gt: vi.fn((a, b) => ({ gt: [a, b] })),
  isNotNull: vi.fn((col) => ({ isNotNull: col })),
}))

vi.mock("@/lib/db/schema", () => ({
  communityJoinRequests: {
    normalizedPhone: "community_join_requests.normalized_phone",
    normalizedSocialUsername: "community_join_requests.normalized_social_username",
  },
}))

import { count, gt, isNotNull } from "drizzle-orm"
import { addDuplicateFlags, fetchDuplicateKeys } from "../admin-requests"
import type { CommunityJoinRequest } from "@/lib/db/schema"

const mockGt = gt as unknown as ReturnType<typeof vi.fn>
const mockCount = count as unknown as ReturnType<typeof vi.fn>
const mockIsNotNull = isNotNull as unknown as ReturnType<typeof vi.fn>

function makeRequest(overrides: Partial<CommunityJoinRequest> = {}): CommunityJoinRequest {
  return {
    id: "req-1",
    userId: null,
    fullName: "Irham Ghifari",
    phone: "081284051103",
    normalizedPhone: "6281284051103",
    socialUsername: "@irhamghifarii",
    normalizedSocialUsername: "irhamghifarii",
    intent: "mau tau update info umroh mandiri",
    status: "NEW",
    adminNote: "",
    createdAt: new Date("2026-07-27T04:49:00Z"),
    updatedAt: new Date("2026-07-27T04:49:00Z"),
    ...overrides,
  } as CommunityJoinRequest
}

function keys(phones: string[] = [], socials: string[] = []) {
  return { phones: new Set(phones), socials: new Set(socials) }
}

describe("addDuplicateFlags", () => {
  it("flags both requests that share a normalized phone", () => {
    const requests = [
      makeRequest({ id: "a", normalizedPhone: "628111", normalizedSocialUsername: "alpha" }),
      makeRequest({ id: "b", normalizedPhone: "628111", normalizedSocialUsername: "beta" }),
    ]

    const flagged = addDuplicateFlags(requests, keys(["628111"]))

    expect(flagged.map((r) => r.possibleDuplicate)).toEqual([true, true])
    expect(flagged.map((r) => r.duplicateByPhone)).toEqual([true, true])
    expect(flagged.map((r) => r.duplicateBySocial)).toEqual([false, false])
  })

  it("flags both requests that share a normalized social username", () => {
    const requests = [
      makeRequest({ id: "a", normalizedPhone: "628111", normalizedSocialUsername: "shared" }),
      makeRequest({ id: "b", normalizedPhone: "628222", normalizedSocialUsername: "shared" }),
    ]

    const flagged = addDuplicateFlags(requests, keys([], ["shared"]))

    expect(flagged.map((r) => r.possibleDuplicate)).toEqual([true, true])
    expect(flagged.map((r) => r.duplicateBySocial)).toEqual([true, true])
    expect(flagged.map((r) => r.duplicateByPhone)).toEqual([false, false])
  })

  it("sets both flags when phone and social are shared", () => {
    const request = makeRequest({ normalizedPhone: "628111", normalizedSocialUsername: "shared" })

    const [flagged] = addDuplicateFlags([request], keys(["628111"], ["shared"]))

    expect(flagged.duplicateByPhone).toBe(true)
    expect(flagged.duplicateBySocial).toBe(true)
    expect(flagged.possibleDuplicate).toBe(true)
  })

  it("never flags a social duplicate when the normalized social is null", () => {
    const requests = [
      makeRequest({ id: "a", normalizedPhone: "628111", normalizedSocialUsername: null }),
      makeRequest({ id: "b", normalizedPhone: "628222", normalizedSocialUsername: null }),
    ]

    const flagged = addDuplicateFlags(requests, keys([], ["shared"]))

    expect(flagged.map((r) => r.duplicateBySocial)).toEqual([false, false])
    expect(flagged.map((r) => r.possibleDuplicate)).toEqual([false, false])
  })

  // The core regression: the in-memory implementation derived duplicate counts
  // from the array it was handed, so a paginated slice reported "no duplicate"
  // for a request whose twin lived on another page.
  it("flags a lone request whose phone is in the duplicate key set", () => {
    const request = makeRequest({ normalizedPhone: "628111", normalizedSocialUsername: null })

    const [flagged] = addDuplicateFlags([request], keys(["628111"]))

    expect(flagged.possibleDuplicate).toBe(true)
    expect(flagged.duplicateByPhone).toBe(true)
  })

  it("flags a lone request whose social is in the duplicate key set", () => {
    const request = makeRequest({ normalizedPhone: "628999", normalizedSocialUsername: "shared" })

    const [flagged] = addDuplicateFlags([request], keys([], ["shared"]))

    expect(flagged.possibleDuplicate).toBe(true)
    expect(flagged.duplicateBySocial).toBe(true)
  })

  it("flags nothing when the duplicate key sets are empty", () => {
    const requests = [
      makeRequest({ id: "a", normalizedPhone: "628111" }),
      makeRequest({ id: "b", normalizedPhone: "628111" }),
    ]

    const flagged = addDuplicateFlags(requests, keys())

    expect(flagged.map((r) => r.possibleDuplicate)).toEqual([false, false])
  })

  it("preserves the original request fields", () => {
    const [flagged] = addDuplicateFlags([makeRequest({ fullName: "Dessy Dwi Lestari" })], keys())

    expect(flagged.fullName).toBe("Dessy Dwi Lestari")
    expect(flagged.phone).toBe("081284051103")
  })
})

describe("fetchDuplicateKeys", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    groupByResults.phones = []
    groupByResults.socials = []
    recordedQueries.length = 0
  })

  // Without these the aggregate is unverified: a mock that swallows the
  // predicate stays green if `.having()` is dropped or the threshold is wrong,
  // which would flag every row in the table as a duplicate.
  it("restricts both aggregates to values seen more than once", async () => {
    await fetchDuplicateKeys()

    expect(mockGt).toHaveBeenCalledWith("COUNT(*)", 1)
    expect(mockCount).toHaveBeenCalled()

    const grouped = recordedQueries.filter((query) => query.column)
    expect(grouped).toHaveLength(2)
    for (const query of grouped) {
      expect(query.having).toEqual({ gt: ["COUNT(*)", 1] })
    }
  })

  it("groups by the two normalized contact columns", async () => {
    await fetchDuplicateKeys()

    expect(recordedQueries.map((query) => query.column).sort()).toEqual([
      "community_join_requests.normalized_phone",
      "community_join_requests.normalized_social_username",
    ])
  })

  it("excludes null social handles at the SQL level, not just in JS", async () => {
    await fetchDuplicateKeys()

    expect(mockIsNotNull).toHaveBeenCalledWith(
      "community_join_requests.normalized_social_username"
    )

    const socialQuery = recordedQueries.find(
      (query) => query.column === "community_join_requests.normalized_social_username"
    )
    expect(socialQuery?.where).toEqual({
      isNotNull: "community_join_requests.normalized_social_username",
    })

    // The phone aggregate must NOT carry that guard -- normalizedPhone is notNull.
    const phoneQuery = recordedQueries.find(
      (query) => query.column === "community_join_requests.normalized_phone"
    )
    expect(phoneQuery?.where).toBeUndefined()
  })

  it("returns only values the aggregate reported, so singletons never appear", async () => {
    // The HAVING COUNT(*) > 1 clause is what excludes singletons, so the
    // aggregate only ever hands back values seen more than once.
    groupByResults.phones = [{ value: "628111" }, { value: "628222" }]
    groupByResults.socials = [{ value: "shared" }]

    const result = await fetchDuplicateKeys()

    expect(result.phones).toEqual(new Set(["628111", "628222"]))
    expect(result.socials).toEqual(new Set(["shared"]))
  })

  it("returns empty sets when no value repeats", async () => {
    const result = await fetchDuplicateKeys()

    expect(result.phones.size).toBe(0)
    expect(result.socials.size).toBe(0)
  })

  it("drops null and empty social values from the set", async () => {
    groupByResults.socials = [{ value: null }, { value: "" }, { value: "shared" }]

    const result = await fetchDuplicateKeys()

    expect(result.socials).toEqual(new Set(["shared"]))
  })
})
