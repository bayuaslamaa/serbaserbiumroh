import { CommunityJoinRepository } from '../repository';
import { CommunityJoinUseCase } from '../usecase';
import type { SubmitJoinRequestArgs } from '../port/usecase.port';

const repository = new CommunityJoinRepository();
const useCase = new CommunityJoinUseCase(repository);

export const submitCommunityJoin = (args: SubmitJoinRequestArgs) => {
  return useCase.submit(args);
};
