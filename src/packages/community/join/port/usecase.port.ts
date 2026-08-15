import type { CommunityJoinInput } from '../domain/join-request';
import type { CommunityJoinRecord } from './repository.port';

export type SubmitJoinRequestArgs = {
  input: CommunityJoinInput;
  userId: string | null;
};

export type SubmitJoinRequestResult =
  { ok: true; request: CommunityJoinRecord } | { ok: false; error: string };

export interface ICommunityJoinUsecase {
  submit(args: SubmitJoinRequestArgs): Promise<SubmitJoinRequestResult>;
}
