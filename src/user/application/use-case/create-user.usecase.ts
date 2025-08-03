import { inject, injectable } from 'inversify'

import { DomainEventPublisher } from '@/shared/domain/event/domain-event-publisher'
import {
  type Either,
  type Failure,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import type { UnitOfWork } from '@/shared/infra/database/repository/unit-of-work/unit-of-work'
import { SHARED_TYPES, USER_TYPES } from '@/shared/infra/ioc/types'
import type { Logger } from '@/shared/infra/logger/logger'
import type { Queue } from '@/shared/infra/queue/queue'
import { UserCreatedEvent } from '@/user/domain/event/user-created-event'
import {
  User,
  type UserCreate,
  type UserValidationErrors,
} from '@/user/domain/user'
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
    @inject(USER_TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Queue)
    private readonly queue: Queue,
    @inject(SHARED_TYPES.Logger)
    private readonly logger: Logger,
    @inject(SHARED_TYPES.UnitOfWork)
    private readonly unitOfWork: UnitOfWork,
  ) {
    void this.bindMethod()
    void this.setupEventListener()
  }

  private bindMethod(): void {
    this.createDomainEventSubscriber =
      this.createDomainEventSubscriber.bind(this)
  }

  private setupEventListener(): void {
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

  public async execute(
    input: CreateUserUseCaseInput,
  ): Promise<CreateUserOutput> {
    const userFound = await this.userOfEmail(input)
    if (userFound) return failure(new UserAlreadyExistsError())
    const userCreatedResult = this.createUser(input)
    if (userCreatedResult.isFailure()) return failure(userCreatedResult.value)
    await this.unitOfWork.performTransaction(async (tx): Promise<void> => {
      await this.userRepository
        .withTransaction(tx)
        .save(userCreatedResult.value)
    })
    const user = userCreatedResult.value
    void this.publishUserCreatedEvent(user)
    return success({
      email: user.email,
    })
  }

  private async userOfEmail(
    userDTO: CreateUserUseCaseInput,
  ): Promise<User | null> {
    const userQuery = UserQuery.from(userDTO).addField('email')
    return this.userRepository.get(userQuery)
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

  private createUserCreatedEvent(
    userCreateProps: Pick<UserCreate, 'name' | 'email'>,
  ): UserCreatedEvent {
    return new UserCreatedEvent({
      name: userCreateProps.name,
      email: userCreateProps.email,
    })
  }

  private publishUserCreatedEvent(anUser: User): void {
    console.log('** Publish user created event **')
    DomainEventPublisher.instance.publish(
      this.createUserCreatedEvent({
        email: anUser.email,
        name: anUser.name,
      }),
    )
  }
}
