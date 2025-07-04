import { inject, injectable } from 'inversify'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { USER_TYPES } from '@/shared/infra/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface ActiveUserUseCaseInput {
  userId: string
}

export type ActiveUserUseCaseOutput = Promise<Either<UserNotFoundError, null>>

@injectable()
export class ActiveUserUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: ActiveUserUseCaseInput,
  ): Promise<ActiveUserUseCaseOutput> {
    const userFound = await this.userRepository.userOfId(input.userId)
    if (!userFound) return failure(new UserNotFoundError())
    userFound.activate()
    await this.userRepository.update(userFound)
    return success(null)
  }
}
