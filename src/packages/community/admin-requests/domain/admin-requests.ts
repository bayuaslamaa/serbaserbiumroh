import { count, gt, isNotNull } from 'drizzle-orm';
import { db } from '@/shared/db';
import { communityJoinRequests } from '@/shared/db/schema';
import type { CommunityJoinRequest } from '@/shared/db/schema';

export type CommunityJoinRequestWithDuplicateFlags = CommunityJoinRequest & {
  possibleDuplicate: boolean;
  duplicateByPhone: boolean;
  duplicateBySocial: boolean;
};

export type DuplicateKeys = {
  phones: Set<string>;
  socials: Set<string>;
};

export const fetchDuplicateKeys = async (): Promise<DuplicateKeys> => {
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
  ]);

  return {
    phones: new Set(phoneRows.map((row) => row.value).filter(Boolean) as string[]),
    socials: new Set(socialRows.map((row) => row.value).filter(Boolean) as string[]),
  };
};

export const addDuplicateFlags = (
  requests: CommunityJoinRequest[],
  duplicateKeys: DuplicateKeys,
): CommunityJoinRequestWithDuplicateFlags[] => {
  return requests.map((request) => {
    const duplicateByPhone = duplicateKeys.phones.has(request.normalizedPhone);
    const duplicateBySocial =
      !!request.normalizedSocialUsername &&
      duplicateKeys.socials.has(request.normalizedSocialUsername);

    return {
      ...request,
      possibleDuplicate: duplicateByPhone || duplicateBySocial,
      duplicateByPhone,
      duplicateBySocial,
    };
  });
};
