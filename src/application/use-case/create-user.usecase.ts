import { inject, injectable } from 'inversify'

import { User } from '@/domain/user'
import { TYPES } from '@/infra/ioc/types'

import type { UserRepository } from '../repository/user-repository'
import { UserAlreadyExistsError } from './user-already-exists-error'

export interface CreateUserInput {
  name: string
  email: string
  rawPassword: string
}

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userRepository: UserRepository,
  ) {}

  public async execute(input: CreateUserInput) {
    await this.findByEmailOrThrow(input.email)
    const user = await this.createUser(input)
    await this.userRepository.create(user)
  }

  private async findByEmailOrThrow(email: string) {
    const user = await this.userRepository.findByEmail(email)
    if (user) throw new UserAlreadyExistsError()
  }

  private async createUser(input: CreateUserInput) {
    return User.create({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
    })
  }
}
