import { inject, injectable } from 'inversify'
import IORedis, { type Redis } from 'ioredis'

import { env } from '@/infra/env'

import type { CacheDB } from './cache-db'
import { CacheDBMemory } from './cache-db-memory'

@injectable()
export class RedisAdapter implements CacheDB {
  private client: Redis
  private isRedisAvailable = true
  private connectionAttempts = 0
  private readonly maxAttempts = 10
  private reconnecting = false

  constructor(@inject(CacheDBMemory) private readonly cacheMemory: CacheDB) {
    this.client = this.createClient()
    this.setupMonitoring()
  }

  private createClient(): Redis {
    return new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        this.connectionAttempts++
        if (this.connectionAttempts > this.maxAttempts) {
          console.warn(
            'Máximo de tentativas atingido. Pausando reconexão por 60s.',
          )
          if (!this.reconnecting) this.cooldownAndReconnect()
          return null
        }
        const delay = Math.min(1000 * Math.pow(2, times), 10000)
        console.warn(`Tentativa ${times}: nova em ${delay}ms`)
        return delay
      },
    })
  }

  private cooldownAndReconnect(): void {
    const ONE_MINUTE = 30000
    this.reconnecting = true
    this.isRedisAvailable = false
    setTimeout(async () => {
      console.warn('Tentando nova instância Redis após cooldown...')
      try {
        if (this.client.status !== 'end') {
          await this.client.quit()
        }
      } catch {
        console.warn('Falha ao encerrar Redis anterior. Ignorando.')
      }
      this.client = this.createClient()
      this.setupMonitoring()
      this.connectionAttempts = 0
      this.reconnecting = false
    }, ONE_MINUTE)
  }

  private setupMonitoring(): void {
    this.client.on('ready', () => {
      this.isRedisAvailable = true
      console.info('Redis disponível novamente.')
    })
    this.client.on('error', () => {
      this.isRedisAvailable = false
      console.warn('Redis error - fallback ativado.')
    })
    this.client.on('end', () => {
      this.isRedisAvailable = false
      console.warn('Redis connection closed.')
    })
  }

  private get useFallback(): boolean {
    return !this.isRedisAvailable
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.useFallback) {
      return this.cacheMemory.get<T>(key)
    }

    try {
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : null
    } catch {
      console.warn('Erro no Redis durante get(). Ativando fallback.')
      this.isRedisAvailable = false
      return this.cacheMemory.get<T>(key)
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

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {
      console.warn('Erro no Redis durante set(). Ativando fallback.')
      this.isRedisAvailable = false
      await this.cacheMemory.set(key, value, ttlSeconds)
    }
  }

  public async delete(key: string): Promise<void> {
    if (this.useFallback) {
      await this.cacheMemory.delete(key)
      return
    }

    try {
      await this.client.del(key)
    } catch {
      console.warn('Erro no Redis durante delete(). Ativando fallback.')
      this.isRedisAvailable = false
      await this.cacheMemory.delete(key)
    }
  }

  public async clear(): Promise<void> {
    if (this.useFallback) {
      await this.cacheMemory.clear()
      return
    }

    try {
      await this.client.flushall()
    } catch {
      console.warn('Erro no Redis durante clear(). Ativando fallback.')
      this.isRedisAvailable = false
      await this.cacheMemory.clear()
    }
  }
}
