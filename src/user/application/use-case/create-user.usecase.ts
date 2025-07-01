import { inject, injectable } from 'inversify'

import { DomainEventPublisher } from '@/shared/domain/event/domain-event-publisher'
import {
  type Either,
  type Failure,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { TYPES } from '@/shared/infra/ioc/types'
import type { Logger } from '@/shared/infra/logger/logger'
import type { Queue } from '@/shared/infra/queue/queue'
import { UserCreatedEvent } from '@/user/domain/event/user-created-event'
import { User, type UserValidationErrors } from '@/user/domain/user'
import type { RoleTypes } from '@/user/domain/value-object/role'

import { UserAlreadyExistsError } from '../error/user-already-exists-error'
import { UserQuery } from '../repository/user-query'
import type { UserRepository } from '../repository/user-repository'

export interface CreateUserUseCaseInput {
  name: string
  email: string
  rawPassword: string
  role?: RoleTypes
}

export interface CreateUserResponse {
  email: string
}

export type CreateUserOutput = Either<
  UserAlreadyExistsError | UserValidationErrors[],
  CreateUserResponse
>

type ErrorType<T> = T extends Failure<infer E, any> ? E : never

export type CreateUserError = ErrorType<CreateUserOutput>

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(TYPES.Queue)
    private readonly queue: Queue,
    @inject(TYPES.Logger)
    private readonly logger: Logger,
  ) {
    this.bindMethod()
  }

  private bindMethod(): void {
    this.createDomainEventSubscriber =
      this.createDomainEventSubscriber.bind(this)
  }

  public async execute(
    input: CreateUserUseCaseInput,
  ): Promise<CreateUserOutput> {
    const userFound = await this.userOfEmail(input)
    if (userFound) return failure(new UserAlreadyExistsError())
    void this.addUserCreatedEventListener()
    const createUserResult = this.createUser(input)
    if (createUserResult.isFailure()) return failure(createUserResult.value)
    await this.userRepository.save(createUserResult.value)
    return success({
      email: createUserResult.value.email,
    })
  }

  private async userOfEmail(
    userDTO: CreateUserUseCaseInput,
  ): Promise<User | null> {
    const userQuery = UserQuery.from(userDTO).addField('email')
    return this.userRepository.get(userQuery)
  }

  private addUserCreatedEventListener(): void {
    DomainEventPublisher.instance.subscribe(
      'userCreated',
      this.createDomainEventSubscriber,
    )
  }

  private async createDomainEventSubscriber(
    event: UserCreatedEvent,
  ): Promise<void> {
    this.logger.info(this, event)
    this.queue.publish(event.eventName, event)
  }

  private createUser(
    input: CreateUserUseCaseInput,
  ): Either<UserValidationErrors[], User> {
    return User.create({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
      role: input.role,
    })
  }
}
