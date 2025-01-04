import { inject, injectable } from 'inversify'
import type { ValidationError } from 'zod-validation-error'

import { EVENTS } from '@/domain/event/events'
import { UserCreatedEvent } from '@/domain/event/user-created-event'
import { User } from '@/domain/user'
import type { RoleTypes } from '@/domain/value-object/role'
import type { MailerGateway } from '@/infra/gateway/mailer-gateway'
import { TYPES } from '@/infra/ioc/types'
import type { Queue } from '@/infra/queue/queue'

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
    @inject(TYPES.Queue)
    private readonly queue: Queue,
    @inject(TYPES.Mailer)
    private readonly mailer: MailerGateway,
  ) {}

  public async execute(
    input: CreateUserUseCaseInput,
  ): Promise<CreateUserOutput> {
    const userOrNull = await this.findUserByEmail(input.email)
    if (userOrNull) return failure(new UserAlreadyExistsError())
    const userOrError = await this.createUser(input)
    if (userOrError.isFailure()) return failure(userOrError.value)
    await this.userRepository.save(userOrError.value)
    // await this.mailer.sendMail(
    //   userOrError.value.email,
    //   'User created',
    //   'User created successfully [Sync]',
    // )
    await this.queue.publish(
      EVENTS.USER_CREATED,
      new UserCreatedEvent({
        name: userOrError.value.name,
        email: userOrError.value.email,
      }),
    )
    // console.log(1)
    // console.log(2)
    // console.log(3)
    return success({
      email: userOrError.value.email,
    })
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email)
  }

  private async createUser(input: CreateUserUseCaseInput) {
    return User.create({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
      role: input.role,
    })
  }
}
