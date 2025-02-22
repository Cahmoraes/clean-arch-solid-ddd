import { inject, injectable } from 'inversify'

import type { RoleTypes } from '@/domain/user/value-object/role'
import type { CacheDB } from '@/infra/database/redis/cache-db'
import { env } from '@/infra/env'
import { TYPES } from '@/infra/ioc/types'

import type { FetchUsersOutput, UserDAO } from '../dao/user-dao'

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
    @inject(TYPES.Redis)
    private readonly cacheDB: CacheDB,
  ) {}

  public async execute(
    input: FetchUsersUseCaseInput,
  ): Promise<FetchUsersUseCaseOutput> {
    // const usersCacheResult = await this.fetchUsersFromCache(input)
    // if (usersCacheResult) return usersCacheResult
    const usersData = await this.userDAO.fetchAndCountUsers(input)
    // this.saveUserDataToCache(input, usersData)
    return {
      data: usersData.usersData,
      pagination: {
        total: usersData.total,
        page: input.page,
        limit: input.limit,
      },
    }
  }

  private async fetchUsersFromCache(
    input: FetchUsersUseCaseInput,
  ): Promise<FetchUsersUseCaseOutput | null> {
    return this.cacheDB.get<FetchUsersUseCaseOutput>(this.createCacheKey(input))
  }

  private createCacheKey(input: FetchUsersUseCaseInput): string {
    return `fetch-users:${input.page}:${input.limit}`
  }

  private async saveUserDataToCache(
    input: FetchUsersUseCaseInput,
    usersData: FetchUsersOutput,
  ): Promise<void> {
    this.cacheDB.set(
      this.createCacheKey(input),
      {
        data: usersData,
        pagination: {
          total: usersData.total,
          page: input.page,
          limit: input.limit,
        },
      },
      env.TTL,
    )
  }
}
