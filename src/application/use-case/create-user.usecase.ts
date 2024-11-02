import { inject, injectable } from 'inversify'

import { User } from '@/domain/user'
import { TYPES } from '@/infra/ioc/types'

import { type Either, left, right } from '../either'
import { UserAlreadyExistsError } from '../error/user-already-exists-error'
import type { UserRepository } from '../repository/user-repository'

export interface CreateUserUseCaseInput {
  name: string
  email: string
  rawPassword: string
}

export interface CreateUserProps {
  email: string
}

export type CreateUserUseCaseOutput = Either<
  UserAlreadyExistsError,
  CreateUserProps
>

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(
    input: CreateUserUseCaseInput,
  ): Promise<CreateUserUseCaseOutput> {
    const userOrNull = await this.findUserByEmail(input.email)
    if (userOrNull) return left(new UserAlreadyExistsError())
    const user = await this.createUser(input)
    await this.userRepository.create(user)
    return right({
      email: user.email,
    })
  }

  private async findUserByEmail(email: string) {
    const user = await this.userRepository.findByEmail(email)
    return user ? user : null
  }

  private async createUser(input: CreateUserUseCaseInput) {
    return User.create({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
    })
  }
}
