import { inject, injectable } from 'inversify'

import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'
import { TYPES } from '@/infra/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface SuspendUserUseCaseInput {
  userId: string
}

export type SuspendUserUseCaseOutput = Promise<Either<UserNotFoundError, null>>

@injectable()
export class SuspendUserUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: SuspendUserUseCaseInput,
  ): Promise<SuspendUserUseCaseOutput> {
    const userFound = await this.userRepository.userOfId(input.userId)
    if (!userFound) return failure(new UserNotFoundError())
    userFound.suspend()
    await this.userRepository.update(userFound)
    return success(null)
  }
}
