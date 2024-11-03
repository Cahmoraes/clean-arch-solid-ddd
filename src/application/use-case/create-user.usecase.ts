import { inject, injectable } from 'inversify'
import type { ValidationError } from 'zod-validation-error'

import { User } from '@/domain/user'
import { TYPES } from '@/shared/ioc/types'

import { type Either, left, right } from '../../domain/value-object/either'
import { UserAlreadyExistsError } from '../error/user-already-exists-error'
import type { UserRepository } from '../repository/user-repository'

export interface CreateUserInput {
  name: string
  email: string
  rawPassword: string
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
  ) {}

  public async execute(input: CreateUserInput): Promise<CreateUserOutput> {
    const userOrNull = await this.findUserByEmail(input.email)
    if (userOrNull) return left(new UserAlreadyExistsError())
    const userOrError = await this.createUser(input)
    if (userOrError.isLeft()) return left(userOrError.value)
    await this.userRepository.save(userOrError.value)
    return right({
      email: userOrError.value.email,
    })
  }

  private async findUserByEmail(email: string) {
    const user = await this.userRepository.findByEmail(email)
    return user ? user : null
  }

  private async createUser(input: CreateUserInput) {
    return User.create({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
    })
  }
}
