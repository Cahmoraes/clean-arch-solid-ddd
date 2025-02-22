import type { interfaces } from 'inversify'

import type { CacheDB } from '@/infra/database/redis/cache-db'
import { CacheDBMemory } from '@/infra/database/redis/cache-db-memory'
import { RedisAdapter } from '@/infra/database/redis/redis-adapter'
import { isDevelopment } from '@/infra/env'

export class CacheDBProvider {
  public static provide(context: interfaces.Context): CacheDB {
    return isDevelopment()
      ? context.container.get(CacheDBMemory)
      : context.container.get(RedisAdapter)
  }
}
