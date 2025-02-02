import { inject, injectable } from 'inversify'
import type { ValidationError } from 'zod-validation-error'

import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'
import { PasswordChangedEvent } from '@/domain/user/event/password-changed-event'
import type { User } from '@/domain/user/user'
import { TYPES } from '@/infra/ioc/types'
import type { Queue } from '@/infra/queue/queue'

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
    @inject(TYPES.Queue)
    private readonly queue: Queue,
  ) {
    this.bindMethod()
  }

  private bindMethod(): void {
    this.handlePasswordChangedEvent = this.handlePasswordChangedEvent.bind(this)
  }

  public async execute(
    input: ChangePasswordUseCaseInput,
  ): Promise<ChangePasswordUseCaseOutput> {
    const userOrNull = await this.userRepository.userOfId(input.userId)
    if (!userOrNull) return failure(new UserNotFoundError())
    if (this.isPasswordUnchanged(userOrNull, input.newRawPassword)) {
      return failure(new PasswordUnchangedError())
    }
    userOrNull.addObserver(this.handlePasswordChangedEvent)
    const result = userOrNull.changePassword(input.newRawPassword)
    if (result.isFailure()) return failure(result.value)
    return success(null)
  }

  private isPasswordUnchanged(user: User, newRawPassword: string): boolean {
    return user.checkPassword(newRawPassword)
  }

  private handlePasswordChangedEvent(data: PasswordChangedEvent): void {
    const event = new PasswordChangedEvent({
      name: data.payload.name,
      email: data.payload.email,
    })
    this.queue.publish(event.eventName, event)
  }
}
