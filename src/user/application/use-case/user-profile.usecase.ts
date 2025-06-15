import { inject, injectable } from 'inversify'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { TYPES } from '@/shared/infra/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface UserProfileUseCaseInput {
  userId: string
}

interface UserProfileUseCaseOutputDTO {
  id: string | null
  name: string
  email: string
}

export type UserProfileUseCaseOutput = Either<
  Error,
  UserProfileUseCaseOutputDTO
>

@injectable()
export class UserProfileUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: UserProfileUseCaseInput,
  ): Promise<UserProfileUseCaseOutput> {
    const userOrNull = await this.userRepository.userOfId(input.userId)
    if (!userOrNull) return failure(new UserNotFoundError())
    return success({
      email: userOrNull.email,
      id: userOrNull.id,
      name: userOrNull.name,
    })
  }
}
