import { count, gt, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { communityJoinRequests } from "@/lib/db/schema"
import type { CommunityJoinRequest } from "@/lib/db/schema"

export type CommunityJoinRequestWithDuplicateFlags = CommunityJoinRequest & {
  possibleDuplicate: boolean
  duplicateByPhone: boolean
  duplicateBySocial: boolean
}

/**
 * Normalized contact values that appear on more than one request, across the
 * whole table.
 */
export type DuplicateKeys = {
  phones: Set<string>
  socials: Set<string>
}

/**
 * Duplicate detection has to see the whole table, not the rows currently on
 * screen. Aggregating in SQL is what keeps the flags honest once the admin list
 * is paginated -- counting within the page would report "no duplicate" for a
 * request whose twin sits on another page.
 *
 * Both columns are indexed (community_join_requests_normalized_phone_idx,
 * community_join_requests_normalized_social_idx), so the grouping is cheap.
 */
export async function fetchDuplicateKeys(): Promise<DuplicateKeys> {
  const [phoneRows, socialRows] = await Promise.all([
    db
      .select({ value: communityJoinRequests.normalizedPhone })
      .from(communityJoinRequests)
      .groupBy(communityJoinRequests.normalizedPhone)
      .having(gt(count(), 1)),
    db
      .select({ value: communityJoinRequests.normalizedSocialUsername })
      .from(communityJoinRequests)
      .where(isNotNull(communityJoinRequests.normalizedSocialUsername))
      .groupBy(communityJoinRequests.normalizedSocialUsername)
      .having(gt(count(), 1)),
  ])

  return {
    phones: new Set(phoneRows.map((row) => row.value).filter(Boolean) as string[]),
    // Legacy rows could carry "" instead of NULL; an empty username is an
    // absent one and must never match another absent one.
    socials: new Set(socialRows.map((row) => row.value).filter(Boolean) as string[]),
  }
}

/**
 * Pure: decides the flags for a slice of requests given the table-wide keys.
 * Kept free of I/O so the flagging rules stay testable without a database.
 */
export function addDuplicateFlags(
  requests: CommunityJoinRequest[],
  duplicateKeys: DuplicateKeys
): CommunityJoinRequestWithDuplicateFlags[] {
  return requests.map((request) => {
    const duplicateByPhone = duplicateKeys.phones.has(request.normalizedPhone)
    const duplicateBySocial =
      !!request.normalizedSocialUsername &&
      duplicateKeys.socials.has(request.normalizedSocialUsername)

    return {
      ...request,
      possibleDuplicate: duplicateByPhone || duplicateBySocial,
      duplicateByPhone,
      duplicateBySocial,
    }
  })
}
