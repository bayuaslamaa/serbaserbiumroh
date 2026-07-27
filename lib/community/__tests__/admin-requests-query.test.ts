import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryRecord = {
  where: unknown
  limitCalled: boolean
  limit?: number
  offset?: number
  orderByCalled: boolean
}

const dbState = {
  countQueue: [] as number[],
  rows: [] as Record<string, unknown>[],
  queries: [] as QueryRecord[],
}

vi.mock("@/lib/db", () => {
  // A count query ends at .where(); the row query ends at .offset(). One
  // chainable builder serves both -- whether .limit() was called is what tells
  // them apart when the chain is awaited.
  const makeBuilder = () => {
    const record: QueryRecord = { where: undefined, limitCalled: false, orderByCalled: false }
    dbState.queries.push(record)

    const builder: Record<string, unknown> = {
      from: () => builder,
      where: (condition: unknown) => {
        record.where = condition
        return builder
      },
      orderBy: () => {
        record.orderByCalled = true
        return builder
      },
      limit: (value: number) => {
        record.limitCalled = true
        record.limit = value
        return builder
      },
      offset: (value: number) => {
        record.offset = value
        return builder
      },
      then: (resolve: (rows: unknown) => unknown) =>
        Promise.resolve(
          record.limitCalled ? dbState.rows : [{ value: dbState.countQueue.shift() ?? 0 }]
        ).then(resolve),
    }
    return builder
  }

  return { db: { select: vi.fn(() => makeBuilder()) } }
})

// Real drizzle builders -- they are pure SQL construction and need no database.
// Only the operators the assertions inspect are wrapped in spies.
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>()
  return {
    ...actual,
    ilike: vi.fn(actual.ilike),
    inArray: vi.fn(actual.inArray),
    eq: vi.fn(actual.eq),
    desc: vi.fn(actual.desc),
  }
})

import { desc, eq, ilike, inArray } from "drizzle-orm"
import { communityJoinRequests } from "@/lib/db/schema"
import {
  PAGE_SIZE,
  escapeLikePattern,
  fetchAdminRequests,
  fetchRequestStats,
  parseAdminRequestFilters,
  resolvePagination,
} from "../admin-requests-query"

const mockIlike = ilike as unknown as ReturnType<typeof vi.fn>
const mockInArray = inArray as unknown as ReturnType<typeof vi.fn>
const mockEq = eq as unknown as ReturnType<typeof vi.fn>
const mockDesc = desc as unknown as ReturnType<typeof vi.fn>

function keys(phones: string[] = [], socials: string[] = []) {
  return { phones: new Set(phones), socials: new Set(socials) }
}

function filters(overrides: Partial<ReturnType<typeof parseAdminRequestFilters>> = {}) {
  return { status: "ALL" as const, q: "", duplicatesOnly: false, page: 1, ...overrides }
}

/**
 * Flattens a drizzle SQL tree into its literal text, recursing into nested
 * conditions so the composition operators (` and `, ` or `) are visible.
 * Asserting the operators is the only way to prove buildWhere combined the
 * filters correctly -- spying on ilike/eq/inArray proves each fragment was
 * built, never how they were joined.
 */
function renderSql(condition: unknown): string {
  const node = condition as { queryChunks?: unknown[]; value?: unknown }
  if (!node) return ""

  if (Array.isArray(node.queryChunks)) {
    return node.queryChunks.map(renderSql).join("")
  }
  if (Array.isArray(node.value)) {
    return node.value.join("")
  }
  return ""
}

function makeRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    normalizedPhone: `6281${id}`,
    normalizedSocialUsername: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  dbState.countQueue = []
  dbState.rows = []
  dbState.queries = []
})

describe("parseAdminRequestFilters", () => {
  it("reads a known status", () => {
    expect(parseAdminRequestFilters({ status: "NEW" }).status).toBe("NEW")
    expect(parseAdminRequestFilters({ status: "MATCHED" }).status).toBe("MATCHED")
    expect(parseAdminRequestFilters({ status: "REJECTED" }).status).toBe("REJECTED")
  })

  it("falls back to ALL for an unknown status instead of throwing", () => {
    expect(parseAdminRequestFilters({ status: "SAMPAH" }).status).toBe("ALL")
    expect(parseAdminRequestFilters({}).status).toBe("ALL")
  })

  it("clamps non-positive and malformed pages to 1", () => {
    expect(parseAdminRequestFilters({ page: "0" }).page).toBe(1)
    expect(parseAdminRequestFilters({ page: "-3" }).page).toBe(1)
    expect(parseAdminRequestFilters({ page: "abc" }).page).toBe(1)
    expect(parseAdminRequestFilters({ page: "" }).page).toBe(1)
  })

  it("keeps a valid page", () => {
    expect(parseAdminRequestFilters({ page: "7" }).page).toBe(7)
  })

  it("treats a blank or whitespace-only query as no search", () => {
    expect(parseAdminRequestFilters({ q: "" }).q).toBe("")
    expect(parseAdminRequestFilters({ q: "   " }).q).toBe("")
  })

  it("trims the search term", () => {
    expect(parseAdminRequestFilters({ q: "  irham  " }).q).toBe("irham")
  })

  it("only treats dup=1 as the duplicate filter", () => {
    expect(parseAdminRequestFilters({ dup: "1" }).duplicatesOnly).toBe(true)
    expect(parseAdminRequestFilters({ dup: "true" }).duplicatesOnly).toBe(false)
    expect(parseAdminRequestFilters({ dup: "0" }).duplicatesOnly).toBe(false)
    expect(parseAdminRequestFilters({}).duplicatesOnly).toBe(false)
  })

  it("uses the first value when a param repeats", () => {
    expect(parseAdminRequestFilters({ status: ["NEW", "MATCHED"] }).status).toBe("NEW")
  })
})

describe("escapeLikePattern", () => {
  it("escapes the LIKE wildcards so they match literally", () => {
    expect(escapeLikePattern("_")).toBe("\\_")
    expect(escapeLikePattern("100%")).toBe("100\\%")
    expect(escapeLikePattern("a_b%c")).toBe("a\\_b\\%c")
  })

  it("escapes the escape character itself", () => {
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b")
  })

  it("leaves ordinary text alone", () => {
    expect(escapeLikePattern("Irham Ghifari")).toBe("Irham Ghifari")
  })
})

describe("resolvePagination", () => {
  it("keeps a page that is in range", () => {
    expect(resolvePagination(2, 100)).toEqual({ page: 2, pageCount: 4, offset: PAGE_SIZE })
  })

  it("clamps a page past the end to the last valid page", () => {
    expect(resolvePagination(999999, 100)).toEqual({
      page: 4,
      pageCount: 4,
      offset: PAGE_SIZE * 3,
    })
  })

  it("resolves to page 1 when there are no results at all", () => {
    expect(resolvePagination(5, 0)).toEqual({ page: 1, pageCount: 1, offset: 0 })
  })

  it("counts a partial last page", () => {
    expect(resolvePagination(1, PAGE_SIZE + 1).pageCount).toBe(2)
  })
})

describe("fetchAdminRequests", () => {
  it("requests one page of rows in newest-first order", async () => {
    dbState.countQueue = [1616]
    dbState.rows = [makeRow("a")]

    const result = await fetchAdminRequests(filters({ page: 2 }), keys())

    const rowQuery = dbState.queries.find((query) => query.limitCalled)
    expect(rowQuery?.limit).toBe(PAGE_SIZE)
    expect(rowQuery?.offset).toBe(PAGE_SIZE)
    expect(rowQuery?.orderByCalled).toBe(true)
    expect(result.total).toBe(1616)
    expect(result.pageCount).toBe(65)
  })

  it("serves the last valid page when the requested page is past the end", async () => {
    dbState.countQueue = [30]
    dbState.rows = [makeRow("a")]

    const result = await fetchAdminRequests(filters({ page: 999 }), keys())

    expect(result.page).toBe(2)
    expect(dbState.queries.find((query) => query.limitCalled)?.offset).toBe(PAGE_SIZE)
  })

  it("returns an empty page rather than erroring when nothing matches", async () => {
    dbState.countQueue = [0]
    dbState.rows = []

    const result = await fetchAdminRequests(filters({ page: 4 }), keys())

    expect(result.requests).toEqual([])
    expect(result.page).toBe(1)
    expect(result.total).toBe(0)
  })

  it("searches name, phone, and social with one escaped pattern", async () => {
    dbState.countQueue = [1]

    await fetchAdminRequests(filters({ q: "irham" }), keys())

    expect(mockIlike).toHaveBeenCalledWith(communityJoinRequests.fullName, "%irham%")
    expect(mockIlike).toHaveBeenCalledWith(communityJoinRequests.phone, "%irham%")
    expect(mockIlike).toHaveBeenCalledWith(communityJoinRequests.socialUsername, "%irham%")
  })

  it("escapes wildcards in the search term so '_' does not match everything", async () => {
    dbState.countQueue = [0]

    await fetchAdminRequests(filters({ q: "_" }), keys())

    expect(mockIlike).toHaveBeenCalledWith(communityJoinRequests.fullName, "%\\_%")
  })

  it("does not build a search condition when there is no search term", async () => {
    dbState.countQueue = [5]

    await fetchAdminRequests(filters(), keys())

    expect(mockIlike).not.toHaveBeenCalled()
  })

  it("filters by status when one is selected", async () => {
    dbState.countQueue = [5]

    await fetchAdminRequests(filters({ status: "MATCHED" }), keys())

    expect(mockEq).toHaveBeenCalledWith(communityJoinRequests.status, "MATCHED")
  })

  it("does not filter by status for ALL", async () => {
    dbState.countQueue = [5]

    await fetchAdminRequests(filters({ status: "ALL" }), keys())

    expect(mockEq).not.toHaveBeenCalled()
  })

  it("restricts to duplicate contacts when the duplicate filter is on", async () => {
    dbState.countQueue = [2]

    await fetchAdminRequests(filters({ duplicatesOnly: true }), keys(["628111"], ["shared"]))

    expect(mockInArray).toHaveBeenCalledWith(communityJoinRequests.normalizedPhone, ["628111"])
    expect(mockInArray).toHaveBeenCalledWith(communityJoinRequests.normalizedSocialUsername, [
      "shared",
    ])
  })

  // Matching a phone OR a handle -- AND would return only requests that share
  // both, which is a different and much smaller set.
  it("joins the phone and social duplicate keys with OR, not AND", async () => {
    dbState.countQueue = [2]

    await fetchAdminRequests(filters({ duplicatesOnly: true }), keys(["628111"], ["shared"]))

    const where = renderSql(dbState.queries.find((query) => !query.limitCalled)?.where)
    expect(where).toContain(" or ")
    expect(where).not.toContain(" and ")
  })

  it("joins status and search with AND, not OR", async () => {
    dbState.countQueue = [1]

    await fetchAdminRequests(filters({ status: "MATCHED", q: "irham" }), keys())

    const where = renderSql(dbState.queries.find((query) => !query.limitCalled)?.where)
    // The three ILIKE columns are OR'd inside their own group; the status
    // predicate must be AND'd against that group.
    expect(where).toContain(" and ")
    expect(mockEq).toHaveBeenCalledWith(communityJoinRequests.status, "MATCHED")
    expect(mockIlike).toHaveBeenCalledWith(communityJoinRequests.fullName, "%irham%")
  })

  it("composes all three filter dimensions at once", async () => {
    dbState.countQueue = [1]

    await fetchAdminRequests(
      filters({ status: "NEW", q: "irham", duplicatesOnly: true }),
      keys(["628111"])
    )

    const where = renderSql(dbState.queries.find((query) => !query.limitCalled)?.where)
    expect(where).toContain(" and ")
    expect(where).toContain(" or ")
    expect(mockEq).toHaveBeenCalledWith(communityJoinRequests.status, "NEW")
    expect(mockIlike).toHaveBeenCalledWith(communityJoinRequests.phone, "%irham%")
    expect(mockInArray).toHaveBeenCalledWith(communityJoinRequests.normalizedPhone, ["628111"])
  })

  it("orders newest first by createdAt, not by an arbitrary column", async () => {
    dbState.countQueue = [5]

    await fetchAdminRequests(filters(), keys())

    expect(mockDesc).toHaveBeenCalledWith(communityJoinRequests.createdAt)
  })

  it("matches nothing -- not everything -- when the duplicate filter has no keys", async () => {
    dbState.countQueue = [0]

    await fetchAdminRequests(filters({ duplicatesOnly: true }), keys())

    expect(mockInArray).not.toHaveBeenCalled()
    // The guard that matters: an absent condition would widen the filter to the
    // whole table, so a restricting condition must still reach the query.
    const countQuery = dbState.queries.find((query) => !query.limitCalled)
    expect(countQuery?.where).toBeDefined()
    expect(renderSql(countQuery?.where)).toBe("false")
  })

  it("applies no where clause at all when nothing is filtered", async () => {
    dbState.countQueue = [5]

    await fetchAdminRequests(filters(), keys())

    expect(dbState.queries.find((query) => !query.limitCalled)?.where).toBeUndefined()
  })

  it("applies duplicate flags to the returned page", async () => {
    dbState.countQueue = [2]
    dbState.rows = [makeRow("a", { normalizedPhone: "628111" })]

    const result = await fetchAdminRequests(filters(), keys(["628111"]))

    expect(result.requests[0].possibleDuplicate).toBe(true)
    expect(result.requests[0].duplicateByPhone).toBe(true)
  })
})

describe("fetchRequestStats", () => {
  it("returns whole-table counts", async () => {
    dbState.countQueue = [1616, 1612, 4, 0, 240]

    const stats = await fetchRequestStats(keys(["628111"]))

    expect(stats).toEqual({
      total: 1616,
      newCount: 1612,
      matchedCount: 4,
      rejectedCount: 0,
      duplicateCount: 240,
    })
  })

  it("counts no duplicates when there are no duplicate keys", async () => {
    dbState.countQueue = [10, 10, 0, 0, 0]

    const stats = await fetchRequestStats(keys())

    expect(stats.duplicateCount).toBe(0)
    expect(mockInArray).not.toHaveBeenCalled()
  })
})
