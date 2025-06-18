import { inject, injectable } from 'inversify'

import type {
  SessionDAO,
  SessionData,
} from '@/session/application/dao/session-dao'
import { env } from '@/shared/infra/env'
import { TYPES } from '@/shared/infra/ioc/types'

import type { CacheDB } from '../../redis/cache-db'

@injectable()
export class RedisSessionDAO implements SessionDAO {
  constructor(
    @inject(TYPES.Redis)
    private readonly cacheDB: CacheDB,
  ) {}

  public async sessionById(id: string): Promise<SessionData | null> {
    return this.cacheDB.get(id)
  }

  public async create(session: SessionData): Promise<void> {
    const SEVEN_DAYS_IN_SECONDS = this.parseTimeToSeconds(
      env.JWT_REFRESH_EXPIRES_IN,
    )
    return this.cacheDB.set(session.jwi, session, SEVEN_DAYS_IN_SECONDS)
  }

  private parseTimeToSeconds(timeString: string): number {
    const timeValue = parseInt(timeString.slice(0, -1))
    const timeUnit = timeString.slice(-1).toLocaleLowerCase()
    const timeMapper = {
      s: timeValue, // seconds
      m: timeValue * 60, // minutos
      h: timeValue * 60 * 60, // hours
      d: timeValue * 60 * 60 * 24, // day
      w: timeValue * 60 * 60 * 24 * 7, // week
    } as const
    if (!Reflect.has(timeMapper, timeUnit)) {
      throw new Error(`Unsupported time unit: ${timeUnit}`)
    }
    return timeMapper[timeUnit as keyof typeof timeMapper]
  }

  public async delete(session: SessionData): Promise<void> {
    return this.cacheDB.delete(session.jwi)
  }
}
