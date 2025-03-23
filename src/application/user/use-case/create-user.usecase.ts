import { inject, injectable } from 'inversify'

import { DomainEventPublisher } from '@/domain/shared/event/domain-event-publisher'
import { UserCreatedEvent } from '@/domain/user/event/user-created-event'
import { User, type UserValidationErrors } from '@/domain/user/user'
import type { RoleTypes } from '@/domain/user/value-object/role'
import { TYPES } from '@/infra/ioc/types'
import type { Queue } from '@/infra/queue/queue'

import {
  type Either,
  type Failure,
  failure,
  success,
} from '../../../domain/shared/value-object/either'
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
    void this.subscribeToDomainEvent()
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

  private subscribeToDomainEvent(): void {
    DomainEventPublisher.instance.subscribe(
      'userCreated',
      this.createDomainEventSubscriber,
    )
  }

  private async createDomainEventSubscriber(
    event: UserCreatedEvent,
  ): Promise<void> {
    console.log('**************')
    console.log(event)
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
