import { inject, injectable } from 'inversify'

import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/shared/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface UserProfileUseCaseInput {
  id: string
}

export type UserProfileUseCaseOutput = Either<
  Error,
  {
    id: string | null
    name: string
    email: string
  }
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
    const userOrNull = await this.userRepository.findById(input.id)
    if (!userOrNull) return left(new UserNotFoundError())
    return right({
      email: userOrNull.email,
      id: userOrNull.id,
      name: userOrNull.name,
    })
  }
}
