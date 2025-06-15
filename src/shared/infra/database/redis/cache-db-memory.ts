import { injectable } from 'inversify'
import NodeCache from 'node-cache'

import type { CacheDB } from './cache-db'

@injectable()
export class CacheDBMemory implements CacheDB {
  public data: Map<string, any> = new Map()
  private _cache: NodeCache

  constructor() {
    this._cache = new NodeCache()
  }

  public async get<T>(key: string): Promise<T | null> {
    return this._cache.get(key) ?? null
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this._cache.set(key, value)
  }

  public async delete(key: string): Promise<void> {
    this._cache.del(key)
  }

  public async clear(): Promise<void> {
    this._cache.flushAll()
  }
}
