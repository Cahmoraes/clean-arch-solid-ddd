import type { ResolutionContext } from 'inversify'

import type { CacheDB } from '@/infra/database/redis/cache-db'
import { CacheDBMemory } from '@/infra/database/redis/cache-db-memory'
import { isProduction } from '@/infra/env'

export class CacheDBProvider {
  public static provide(context: ResolutionContext): CacheDB {
    return isProduction()
      ? context.get(CacheDBMemory)
      : context.get(CacheDBMemory)
  }
}
