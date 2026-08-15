import type { ParsedCommunityJoinRequest } from '../domain/join-request';

export type CommunityJoinRecord = {
  id: string;
  fullName: string;
  phone: string;
  createdAt: Date;
};

export interface ICreateJoinRequestPayload extends ParsedCommunityJoinRequest {
  userId: string | null;
}

export interface ICommunityJoinRepository {
  create(payload: ICreateJoinRequestPayload): Promise<CommunityJoinRecord>;
}
