import type { ResolutionContext } from 'inversify'

import type { CacheDB } from '@/shared/infra/database/redis/cache-db'
import { CacheDBMemory } from '@/shared/infra/database/redis/cache-db-memory'
import { RedisAdapter } from '@/shared/infra/database/redis/redis-adapter'
import { isProduction } from '@/shared/infra/env'

export class CacheDBProvider {
  public static provide(context: ResolutionContext): CacheDB {
    return isProduction()
      ? context.get(RedisAdapter, { autobind: true })
      : context.get(CacheDBMemory, { autobind: true })
  }
}
