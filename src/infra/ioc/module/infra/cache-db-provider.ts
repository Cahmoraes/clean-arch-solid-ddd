import type { ResolutionContext } from 'inversify'

import type { CacheDB } from '@/infra/database/redis/cache-db'
// import { CacheDBMemory } from '@/infra/database/redis/cache-db-memory'
import { RedisAdapter } from '@/infra/database/redis/redis-adapter'
import { isProduction } from '@/infra/env'

export class CacheDBProvider {
  public static provide(context: ResolutionContext): CacheDB {
    return isProduction()
      ? context.get(RedisAdapter)
      : context.get(RedisAdapter)
  }
}
