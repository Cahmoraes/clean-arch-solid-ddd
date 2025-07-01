import { inject, injectable } from 'inversify'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface SuspendUserUseCaseInput {
  userId: string
}

export type SuspendUserUseCaseOutput = Promise<Either<UserNotFoundError, null>>

@injectable()
export class SuspendUserUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
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
