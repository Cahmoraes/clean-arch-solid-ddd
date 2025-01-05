import { inject, injectable } from 'inversify'
import type { ValidationError } from 'zod-validation-error'

import { User } from '@/domain/user'
import type { RoleTypes } from '@/domain/value-object/role'
import { TYPES } from '@/infra/ioc/types'

import { type Either, failure, success } from '../../domain/value-object/either'
import { UserAlreadyExistsError } from '../error/user-already-exists-error'
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
  UserAlreadyExistsError | ValidationError,
  CreateUserResponse
>

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    // @inject(TYPES.Queue)
    // private readonly queue: Queue,
  ) {}

  public async execute(
    input: CreateUserUseCaseInput,
  ): Promise<CreateUserOutput> {
    const userOrNull = await this.findUserByEmail(input.email)
    if (userOrNull) return failure(new UserAlreadyExistsError())
    // DomainEventPublisher.instance.subscribe(this.createDomainEventSubscriber())
    const userOrError = await this.createUser(input)
    if (userOrError.isFailure()) return failure(userOrError.value)
    await this.userRepository.save(userOrError.value)
    return success({
      email: userOrError.value.email,
    })
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email)
  }

  // DomainEventPublisher.instance.subscribe(this.createDomainEventSubscriber())
  // private createDomainEventSubscriber() {
  //   return (event: UserCreatedEvent) => {
  //     this.queue.publish(
  //       EVENTS.USER_CREATED,
  //       new UserCreatedEvent({
  //         name: event.payload.name,
  //         email: event.payload.email,
  //       }),
  //     )
  //   }
  // }

  private async createUser(input: CreateUserUseCaseInput) {
    return User.create({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
      role: input.role,
    })
  }
}
