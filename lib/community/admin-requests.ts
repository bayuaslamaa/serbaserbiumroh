import type { CommunityJoinRequest } from "@/lib/db/schema"

export type CommunityJoinRequestWithDuplicateFlags = CommunityJoinRequest & {
  possibleDuplicate: boolean
  duplicateByPhone: boolean
  duplicateBySocial: boolean
}

export function addDuplicateFlags(
  requests: CommunityJoinRequest[]
): CommunityJoinRequestWithDuplicateFlags[] {
  const phoneCounts = new Map<string, number>()
  const socialCounts = new Map<string, number>()

  for (const request of requests) {
    phoneCounts.set(request.normalizedPhone, (phoneCounts.get(request.normalizedPhone) ?? 0) + 1)
    if (request.normalizedSocialUsername) {
      socialCounts.set(
        request.normalizedSocialUsername,
        (socialCounts.get(request.normalizedSocialUsername) ?? 0) + 1
      )
    }
  }

  return requests.map((request) => {
    const duplicateByPhone = (phoneCounts.get(request.normalizedPhone) ?? 0) > 1
    const duplicateBySocial =
      !!request.normalizedSocialUsername &&
      (socialCounts.get(request.normalizedSocialUsername) ?? 0) > 1

    return {
      ...request,
      possibleDuplicate: duplicateByPhone || duplicateBySocial,
      duplicateByPhone,
      duplicateBySocial,
    }
  })
}
