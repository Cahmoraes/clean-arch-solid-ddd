import { inject, injectable } from 'inversify'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { USER_TYPES } from '@/shared/infra/ioc/types'
import type { User, UserValidationErrors } from '@/user/domain/user'

import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface UpdateUserProfileUseCaseInput {
  userId: string
  name: string
  email: string
}

export type UpdateUserProfileUseCaseOutput = Either<
  UserValidationErrors[] | UserValidationErrors,
  User
>

@injectable()
export class UpdateUserProfileUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User)
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
