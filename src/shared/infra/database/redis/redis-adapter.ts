import { inject, injectable } from 'inversify'
import IORedis, { type Redis } from 'ioredis'

import { env } from '@/shared/infra/env'
import { TYPES } from '@/shared/infra/ioc/types'
import type { Logger } from '@/shared/infra/logger/logger'

import type { CacheDB } from './cache-db'
import { CacheDBMemory } from './cache-db-memory'

@injectable()
export class RedisAdapter implements CacheDB {
  private static COOLDOWN_TIME = 3_0000 // 30 segundos
  private client: Redis
  private isRedisAvailable = true
  private connectionAttempts = 0
  private readonly maxAttempts = 3
  private reconnecting = false

  constructor(
    @inject(CacheDBMemory) private readonly cacheMemory: CacheDB,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {
    this.client = this.createClient()
    this.setupMonitoring()
  }

  private createClient(): Redis {
    return new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
      retryStrategy: this.createRetryStrategy(),
    })
  }

  private createRetryStrategy() {
    return (times: number) => {
      this.connectionAttempts++
      if (this.connectionAttempts > this.maxAttempts) {
        const timeInSeconds = RedisAdapter.COOLDOWN_TIME / 1000
        this.logger.warn(
          this,
          `Máximo de tentativas atingido. Pausando reconexão por ${timeInSeconds}s.`,
        )
        if (!this.reconnecting) this.cooldownAndReconnect()
        return null
      }
      const delay = Math.min(1000 * Math.pow(2, times), 10000)
      this.logger.warn(this, `Tentativa ${times}: nova em ${delay}ms`)
      return delay
    }
  }

  private cooldownAndReconnect(): void {
    this.reconnecting = true
    this.isRedisAvailable = false
    setTimeout(async () => {
      this.logger.warn(this, 'Tentando nova instância Redis após cooldown...')
      try {
        if (this.client.status !== 'end') {
          await this.client.quit()
        }
      } catch {
        this.logger.warn(this, 'Falha ao encerrar Redis anterior. Ignorando.')
      } finally {
        this.client = this.createClient()
        this.setupMonitoring()
        this.connectionAttempts = 0
        this.reconnecting = false
      }
    }, RedisAdapter.COOLDOWN_TIME)
  }

  private setupMonitoring(): void {
    this.client.removeAllListeners('ready')
    this.client.removeAllListeners('error')
    this.client.removeAllListeners('end')
    this.client.on('ready', () => {
      this.isRedisAvailable = true
      this.logger.info(this, 'Redis disponível novamente.')
    })
    this.client.on('error', () => {
      this.isRedisAvailable = false
      this.logger.warn(this, 'Redis error - fallback ativado.')
    })
    this.client.on('end', () => {
      this.isRedisAvailable = false
      this.logger.warn(this, 'Redis connection closed.')
    })
  }

  private get useFallback(): boolean {
    return !this.isRedisAvailable
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.useFallback) return this.cacheMemory.get<T>(key)
    const data = await this.client.get(key)
    return this.parsedRedisData(data, key)
  }

  private async parsedRedisData<T>(
    data: string | null,
    key: string,
  ): Promise<T | null> {
    try {
      if (!data) return null
      return JSON.parse(data!)
    } catch {
      this.logger.warn(this, `Failed to parse JSON for key ${key}:`)
      await this.client.del(key)
      return null
    }
  }

  public async set<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    if (this.useFallback) {
      await this.cacheMemory.set(key, value, ttlSeconds)
      return
    }
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  public async delete(key: string): Promise<void> {
    if (this.useFallback) {
      await this.cacheMemory.delete(key)
      return
    }
    await this.client.del(key)
  }

  public async clear(): Promise<void> {
    if (this.useFallback) {
      await this.cacheMemory.clear()
      return
    }
    await this.client.flushall()
  }

  public async disconnect(): Promise<void> {
    try {
      this.client.removeAllListeners()
      if (this.client.status !== 'end') {
        await this.client.quit()
      }
    } catch {
      this.logger.warn(this, 'Error during Redis disconnect:')
    }
  }
}
