import { injectable } from 'inversify'
import IORedis, { type Redis } from 'ioredis'

import { env } from '@/infra/env'

import type { CacheDB } from './cache-db'

@injectable()
export class RedisAdapter implements CacheDB {
  private readonly client: Redis

  constructor() {
    this.client = new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    })
  }

  public async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key)
    return data ? JSON.parse(data) : null
  }

  public async set<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key)
  }

  public async clear(): Promise<void> {
    await this.client.flushall()
  }
}
