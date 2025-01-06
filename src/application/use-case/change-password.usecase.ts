import { inject, injectable } from 'inversify'
import type { ValidationError } from 'zod-validation-error'

import type { User } from '@/domain/user'
import { type Either, failure, success } from '@/domain/value-object/either'
import { TYPES } from '@/infra/ioc/types'

import { PasswordUnchangedError } from '../error/password-unchanged-error'
import { UserNotFoundError } from '../error/user-not-found-error'
import type { UserRepository } from '../repository/user-repository'

export interface ChangePasswordUseCaseInput {
  userId: string
  newRawPassword: string
}

export type ChangePasswordUseCaseOutput = Either<
  UserNotFoundError | ValidationError | PasswordUnchangedError,
  null
>

@injectable()
export class ChangePasswordUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: ChangePasswordUseCaseInput,
  ): Promise<ChangePasswordUseCaseOutput> {
    const userOrNull = await this.userRepository.userOfId(input.userId)
    if (!userOrNull) return failure(new UserNotFoundError())
    if (this.isPasswordUnchanged(userOrNull, input.newRawPassword)) {
      return failure(new PasswordUnchangedError())
    }
    const result = userOrNull.changePassword(input.newRawPassword)
    if (result.isFailure()) return failure(result.value)
    return success(null)
  }

  private isPasswordUnchanged(user: User, newRawPassword: string): boolean {
    return user.checkPassword(newRawPassword)
  }
}
