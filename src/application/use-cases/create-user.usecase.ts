import { inject, injectable } from 'inversify'

import { User } from '@/domain/user'
import { PrismaUserRepository } from '@/infra/database/prisma-user-repository'
import { TYPES } from '@/infra/ioc/types'

export interface CreateUserInput {
  name: string
  email: string
  rawPassword: string
}

@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private readonly userDAO: PrismaUserRepository,
  ) {}

  public async execute(input: CreateUserInput) {
    await this.findByEmailOrThrow(input.email)
    const user = await this.createUser(input)
    await this.userDAO.create({
      name: user.name,
      email: user.email,
      passwordHash: user.password,
    })
  }

  private async findByEmailOrThrow(email: string) {
    const user = await this.userDAO.findByEmail(email)
    if (user) throw new Error('User already exists')
  }

  private async createUser(input: CreateUserInput) {
    return User.create({
      name: input.name,
      email: input.email,
      password: input.rawPassword,
    })
  }
}
