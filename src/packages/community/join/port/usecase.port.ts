import type { CommunityJoinInput } from "../domain/join-request"
import type { CommunityJoinRecord } from "./repository.port"

export type SubmitJoinRequestArgs = {
  input: CommunityJoinInput
  userId: string | null
}

/**
 * A rejected submission is a value, not an exception.
 *
 * The route handler has to turn "the name is missing" into 400 and a crashed
 * query into 500, and it cannot tell those apart if both arrive as throws.
 */
export type SubmitJoinRequestResult =
  | { ok: true; request: CommunityJoinRecord }
  | { ok: false; error: string }

export interface ICommunityJoinUsecase {
  submit(args: SubmitJoinRequestArgs): Promise<SubmitJoinRequestResult>
}
