import { inject, injectable } from 'inversify'

import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/infra/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface UserProfileUseCaseInput {
  userId: string
}

interface UserProfileOutputDTO {
  id: string | null
  name: string
  email: string
}

export type UserProfileUseCaseOutput = Either<Error, UserProfileOutputDTO>

@injectable()
export class UserProfileUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: UserProfileUseCaseInput,
  ): Promise<UserProfileUseCaseOutput> {
    const userOrNull = await this.userRepository.findById(input.userId)
    if (!userOrNull) return left(new UserNotFoundError())
    return right({
      email: userOrNull.email,
      id: userOrNull.id,
      name: userOrNull.name,
    })
  }
}
