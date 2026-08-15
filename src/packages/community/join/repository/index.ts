import { db } from "@/shared/db"
import { communityJoinRequests } from "@/shared/db/schema"
import type {
  CommunityJoinRecord,
  ICommunityJoinRepository,
  ICreateJoinRequestPayload,
} from "../port/repository.port"

/**
 * The Drizzle side of the port. Every import of the schema for this slice
 * belongs in this file — that is what keeps the use case database-free.
 */
export class CommunityJoinRepository implements ICommunityJoinRepository {
  async create(payload: ICreateJoinRequestPayload): Promise<CommunityJoinRecord> {
    const [request] = await db.insert(communityJoinRequests).values(payload).returning()
    return request
  }
}
