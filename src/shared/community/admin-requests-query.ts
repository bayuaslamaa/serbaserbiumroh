import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/shared/db"
import { communityJoinRequests } from "@/shared/db/schema"
import { addDuplicateFlags, type DuplicateKeys } from "./admin-requests"
import type { CommunityJoinRequestWithDuplicateFlags } from "./admin-requests"
import { isRequestStatus, type RequestStatus } from "./admin-requests-status"

export const PAGE_SIZE = 25

export type { RequestStatus }
export type StatusFilter = RequestStatus | "ALL"

export type AdminRequestFilters = {
  status: StatusFilter
  q: string
  duplicatesOnly: boolean
  page: number
}

export type RawSearchParams = Record<string, string | string[] | undefined>

function readParam(params: RawSearchParams, key: string): string {
  const value = params[key]
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

/**
 * Pure. Unknown or malformed values fall back to a safe default rather than
 * throwing -- an admin hand-editing the URL should never see a 500.
 *
 * Only the lower bound is clamped here. Clamping to the *last* page needs the
 * result count, which this function has no way to know; fetchAdminRequests
 * does that once the count query has run.
 */
export function parseAdminRequestFilters(params: RawSearchParams): AdminRequestFilters {
  const rawStatus = readParam(params, "status").toUpperCase()
  const status: StatusFilter = isRequestStatus(rawStatus) ? rawStatus : "ALL"

  const rawPage = Number.parseInt(readParam(params, "page"), 10)
  const page = Number.isFinite(rawPage) && rawPage > 1 ? rawPage : 1

  return {
    status,
    q: readParam(params, "q").trim(),
    duplicatesOnly: readParam(params, "dup") === "1",
    page,
  }
}

/**
 * `%` and `_` are LIKE wildcards. Left unescaped, searching for "_" matches
 * every row instead of the rows containing an underscore.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

/** Pure: resolves the effective page once the result count is known. */
export function resolvePagination(requestedPage: number, total: number) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), pageCount)
  return { page, pageCount, offset: (page - 1) * PAGE_SIZE }
}

/**
 * Matches any request whose normalized contact is shared with another request.
 * With no duplicate keys at all this must match nothing -- an absent condition
 * would widen the filter to the whole table, the exact opposite of the intent.
 */
export function buildDuplicateCondition(duplicateKeys: DuplicateKeys): SQL {
  const conditions: SQL[] = []

  if (duplicateKeys.phones.size > 0) {
    conditions.push(inArray(communityJoinRequests.normalizedPhone, [...duplicateKeys.phones]))
  }
  if (duplicateKeys.socials.size > 0) {
    conditions.push(
      inArray(communityJoinRequests.normalizedSocialUsername, [...duplicateKeys.socials])
    )
  }

  if (conditions.length === 0) return sql`false`
  return conditions.length === 1 ? conditions[0] : or(...conditions)!
}

function buildWhere(
  filters: AdminRequestFilters,
  duplicateKeys: DuplicateKeys
): SQL | undefined {
  const conditions: SQL[] = []

  if (filters.status !== "ALL") {
    conditions.push(eq(communityJoinRequests.status, filters.status))
  }

  if (filters.q) {
    const pattern = `%${escapeLikePattern(filters.q)}%`
    conditions.push(
      or(
        ilike(communityJoinRequests.fullName, pattern),
        ilike(communityJoinRequests.phone, pattern),
        ilike(communityJoinRequests.socialUsername, pattern)
      )!
    )
  }

  if (filters.duplicatesOnly) {
    conditions.push(buildDuplicateCondition(duplicateKeys))
  }

  if (conditions.length === 0) return undefined
  return conditions.length === 1 ? conditions[0] : and(...conditions)
}

export type AdminRequestsPage = {
  requests: CommunityJoinRequestWithDuplicateFlags[]
  total: number
  /** The page actually served, which may differ from the one requested. */
  page: number
  pageCount: number
}

export async function fetchAdminRequests(
  filters: AdminRequestFilters,
  duplicateKeys: DuplicateKeys
): Promise<AdminRequestsPage> {
  const where = buildWhere(filters, duplicateKeys)

  const [totals] = await db
    .select({ value: count() })
    .from(communityJoinRequests)
    .where(where)

  const total = Number(totals?.value ?? 0)
  const { page, pageCount, offset } = resolvePagination(filters.page, total)

  const rows = await db
    .select()
    .from(communityJoinRequests)
    .where(where)
    // id breaks ties: Postgres leaves the order among equal created_at values
    // unspecified, so without it rows sharing a timestamp can repeat or vanish
    // across a page boundary.
    .orderBy(desc(communityJoinRequests.createdAt), desc(communityJoinRequests.id))
    .limit(PAGE_SIZE)
    .offset(offset)

  return { requests: addDuplicateFlags(rows, duplicateKeys), total, page, pageCount }
}

export type AdminRequestStats = {
  total: number
  newCount: number
  matchedCount: number
  rejectedCount: number
  duplicateCount: number
}

/**
 * Counts the whole table regardless of the active filter. Numbers that follow
 * the filter degrade into tautologies ("1612 new" out of 1612 filtered rows) and
 * stop working as navigation.
 */
export async function fetchRequestStats(
  duplicateKeys: DuplicateKeys
): Promise<AdminRequestStats> {
  const [total, newCount, matchedCount, rejectedCount, duplicateCount] = await Promise.all([
    db.select({ value: count() }).from(communityJoinRequests),
    db
      .select({ value: count() })
      .from(communityJoinRequests)
      .where(eq(communityJoinRequests.status, "NEW")),
    db
      .select({ value: count() })
      .from(communityJoinRequests)
      .where(eq(communityJoinRequests.status, "MATCHED")),
    db
      .select({ value: count() })
      .from(communityJoinRequests)
      .where(eq(communityJoinRequests.status, "REJECTED")),
    db
      .select({ value: count() })
      .from(communityJoinRequests)
      .where(buildDuplicateCondition(duplicateKeys)),
  ])

  return {
    total: Number(total[0]?.value ?? 0),
    newCount: Number(newCount[0]?.value ?? 0),
    matchedCount: Number(matchedCount[0]?.value ?? 0),
    rejectedCount: Number(rejectedCount[0]?.value ?? 0),
    duplicateCount: Number(duplicateCount[0]?.value ?? 0),
  }
}
