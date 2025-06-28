import { inject, injectable } from 'inversify'

import type { FetchUsersOutput, UserDAO } from '@/user/application/dao/user-dao'
import type { RoleTypes } from '@/user/domain/value-object/role'

import type { CacheDB } from '../../database/redis/cache-db'
import { env } from '../../env'
import { TYPES } from '../../ioc/types'
import type { Logger } from '../../logger/logger'
import type { Task } from './task'

export interface UsersData {
  id: string
  role: RoleTypes
  createdAt: string
  name: string
  email: string
}

export interface CacheUsersData {
  data: {
    usersData: UsersData[]
  }
}

@injectable()
export class UpdateUserProfileCacheTask implements Task {
  constructor(
    @inject(TYPES.DAO.User)
    private readonly userDAO: UserDAO,
    @inject(TYPES.Redis)
    private readonly cacheDB: CacheDB,
    @inject(TYPES.Logger)
    private readonly logger: Logger,
  ) {
    this.bindMethod()
  }

  private bindMethod(): void {
    this.execute = this.execute.bind(this)
  }

  public async execute(): Promise<void> {
    const usersData = await this.userDAO.fetchAndCountUsers({
      limit: 10,
      page: 1,
    })
    await this.saveUserDataToCache(usersData)
    const cacheResult =
      await this.cacheDB.get<CacheUsersData>('fetch-users:1:10')
    this.logger.info(this, `User profile cache updated`)
    this.logger.info(
      this,
      `Cache data: ${JSON.stringify(cacheResult!.data.usersData[0], null, 2)}`,
    )
  }

  private async saveUserDataToCache(
    usersData: FetchUsersOutput,
  ): Promise<void> {
    this.cacheDB.set(
      this.createCacheKey(),
      {
        data: usersData,
        pagination: {
          total: usersData.total,
          page: 1,
          limit: 10,
        },
      },
      env.TTL,
    )
  }

  private createCacheKey(): string {
    return 'fetch-users:1:10'
  }
}
