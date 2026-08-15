import type { ParsedCommunityJoinRequest } from "../domain/join-request"

export type CommunityJoinRecord = {
  id: string
  fullName: string
  phone: string
  createdAt: Date
}

export interface ICreateJoinRequestPayload extends ParsedCommunityJoinRequest {
  userId: string | null
}

/**
 * The only way the use case is allowed to reach storage.
 *
 * Drizzle is deliberately absent from this signature: the use case must stay
 * testable without a database, and swapping the adapter must not reach back
 * into business logic.
 */
export interface ICommunityJoinRepository {
  create(payload: ICreateJoinRequestPayload): Promise<CommunityJoinRecord>
}
