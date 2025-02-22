import type { CacheDB } from './cache-db'

export class CacheDBMemory implements CacheDB {
  public data: Map<string, any> = new Map()

  public async get<T>(key: string): Promise<T | null> {
    return this.data.get(key) ?? null
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value)
  }

  public async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  public async clear(): Promise<void> {
    this.data.clear()
  }
}
