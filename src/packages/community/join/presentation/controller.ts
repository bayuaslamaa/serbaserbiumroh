import { CommunityJoinRepository } from "../repository"
import { CommunityJoinUseCase } from "../usecase"
import type { SubmitJoinRequestArgs } from "../port/usecase.port"

/**
 * Composition root for this slice: the one place the concrete adapter is bound
 * to the use case. Route handlers import `submitCommunityJoin` and stay free of
 * both Drizzle and the validation rules.
 *
 * Badalin's controllers are React hooks because its data lives behind REST and
 * react-query. Here the work happens on the server, so the controller is a
 * plain function — the layering is the same, the runtime is not.
 */
const repository = new CommunityJoinRepository()
const useCase = new CommunityJoinUseCase(repository)

export function submitCommunityJoin(args: SubmitJoinRequestArgs) {
  return useCase.submit(args)
}
