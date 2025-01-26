import { inject, injectable } from 'inversify'

import type { User, UserValidationErrors } from '@/domain/user'
import { type Either, failure, success } from '@/domain/value-object/either'
import { TYPES } from '@/infra/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface UpdateUserProfileUseCaseInput {
  userId: string
  name: string
  email: string
}

export type UpdateUserProfileUseCaseOutput = Either<
  UserNotFoundError | UserValidationErrors,
  User
>

@injectable()
export class UpdateUserProfileUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: UpdateUserProfileUseCaseInput,
  ): Promise<UpdateUserProfileUseCaseOutput> {
    const user = await this.userRepository.userOfId(input.userId)
    if (!user) return failure(new UserNotFoundError())
    const profileUpdateResult = user.updateProfile(input)
    if (profileUpdateResult.isFailure()) {
      return failure(profileUpdateResult.value)
    }
    await this.userRepository.update(user)
    return success(user)
  }
}
