import { inject, injectable } from 'inversify'

import type { RoleTypes } from '@/domain/value-object/role'
import { TYPES } from '@/infra/ioc/types'

import type { UserDAO } from '../dao/user-dao'

export interface FetchUsersUseCaseInput {
  page: number
  limit: number
}

export interface FetchUsersData {
  id: string
  role: RoleTypes
  createdAt: string
  name: string
  email: string
}

export interface FetchUsersMeta {
  total: number
  page: number
  limit: number
}

export interface FetchUsersUseCaseOutput {
  data: FetchUsersData[]
  pagination: FetchUsersMeta
}

@injectable()
export class FetchUsersUseCase {
  constructor(
    @inject(TYPES.DAO.User)
    private readonly userDAO: UserDAO,
  ) {}

  public async execute(
    input: FetchUsersUseCaseInput,
  ): Promise<FetchUsersUseCaseOutput> {
    const { usersData, total } = await this.userDAO.fetchAndCountUsers(input)
    return {
      data: usersData,
      pagination: {
        total,
        page: input.page,
        limit: input.limit,
      },
    }
  }
}
