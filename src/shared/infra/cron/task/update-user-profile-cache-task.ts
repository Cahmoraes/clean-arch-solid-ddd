import { inject, injectable } from 'inversify'

import type { FetchUsersOutput, UserDAO } from '@/user/application/dao/user-dao'

import type { CacheDB } from '../../database/redis/cache-db'
import { env } from '../../env'
import { TYPES } from '../../ioc/types'
import type { Task } from './task'

@injectable()
export class UpdateUserProfileCacheTask implements Task {
  constructor(
    @inject(TYPES.DAO.User)
    private readonly userDAO: UserDAO,
    @inject(TYPES.Redis)
    private readonly cacheDB: CacheDB,
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
    const cacheResult = await this.cacheDB.get('fetch-users:1:10')
    console.log({ usersData })
    console.log({ cacheResult })
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
