import { db } from '@/shared/db';
import { communityJoinRequests } from '@/shared/db/schema';
import type {
  CommunityJoinRecord,
  ICommunityJoinRepository,
  ICreateJoinRequestPayload,
} from '../port/repository.port';

export class CommunityJoinRepository implements ICommunityJoinRepository {
  async create(payload: ICreateJoinRequestPayload): Promise<CommunityJoinRecord> {
    const [request] = await db.insert(communityJoinRequests).values(payload).returning();
    return request;
  }
}
