import { type ResolutionContext } from 'inversify'

import { SessionDAOMemory } from '@/shared/infra/database/dao/in-memory/session-dao-memory'
import { RedisSessionDAO } from '@/shared/infra/database/dao/redis/redis-session-dao'
import { isProduction } from '@/shared/infra/env'

export class SessionDAOProvider {
  public static provide(context: ResolutionContext) {
    return isProduction()
      ? context.get(RedisSessionDAO, { autobind: true })
      : context.get(SessionDAOMemory, { autobind: true })
  }
}
