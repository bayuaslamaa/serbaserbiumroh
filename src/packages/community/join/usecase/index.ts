import { parseCommunityJoinInput } from "../domain/join-request"
import type { ICommunityJoinRepository } from "../port/repository.port"
import type {
  ICommunityJoinUsecase,
  SubmitJoinRequestArgs,
  SubmitJoinRequestResult,
} from "../port/usecase.port"

export class CommunityJoinUseCase implements ICommunityJoinUsecase {
  constructor(private readonly repository: ICommunityJoinRepository) {}

  async submit({ input, userId }: SubmitJoinRequestArgs): Promise<SubmitJoinRequestResult> {
    const parsed = parseCommunityJoinInput(input)
    if (!parsed.success) return { ok: false, error: parsed.error }

    const request = await this.repository.create({ ...parsed.data, userId })
    return { ok: true, request }
  }
}
