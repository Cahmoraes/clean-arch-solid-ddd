import { inject, injectable } from "inversify"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store.js"

const FAILED_PREFIX = "login:failed"
const LOCKED_PREFIX = "login:locked"
const LOCK_TTL_SECONDS = 31_536_000 // 1 year — effectively no TTL

@injectable()
export class RedisLoginAttemptStore implements LoginAttemptStore {
	constructor(
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async increment(email: string, ttlSeconds: number): Promise<number> {
		const key = this.failedKey(email)
		const current = await this.cacheDB.get<number>(key)
		const next = (current ?? 0) + 1
		await this.cacheDB.set(key, next, ttlSeconds)
		return next
	}

	public async deleteFailedAttempts(email: string): Promise<void> {
		await this.cacheDB.delete(this.failedKey(email))
	}

	public async setLocked(userId: string): Promise<void> {
		await this.cacheDB.set(this.lockedKey(userId), true, LOCK_TTL_SECONDS)
	}

	public async isLocked(userId: string): Promise<boolean> {
		const value = await this.cacheDB.get<boolean>(this.lockedKey(userId))
		return value === true
	}

	public async deleteLock(userId: string): Promise<void> {
		await this.cacheDB.delete(this.lockedKey(userId))
	}

	private failedKey(email: string): string {
		return `${FAILED_PREFIX}:${email}`
	}

	private lockedKey(userId: string): string {
		return `${LOCKED_PREFIX}:${userId}`
	}
}
