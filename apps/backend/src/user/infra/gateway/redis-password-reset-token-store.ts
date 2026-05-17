import { inject, injectable } from "inversify"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store.js"

const TOKEN_PREFIX = "pwd-reset"
const UID_PREFIX = "pwd-reset:uid"

@injectable()
export class RedisPasswordResetTokenStore implements PasswordResetTokenStore {
	constructor(
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async saveResetToken(
		userId: string,
		tokenHash: string,
		ttl: number,
	): Promise<void> {
		await this.cacheDB.set(this.makeTokenKey(tokenHash), userId, ttl)
	}

	public async saveUidMapping(
		userId: string,
		tokenHash: string,
		ttl: number,
	): Promise<void> {
		await this.cacheDB.set(this.makeUidKey(userId), tokenHash, ttl)
	}

	public async findUserIdByTokenHash(
		tokenHash: string,
	): Promise<string | null> {
		return this.cacheDB.get<string>(this.makeTokenKey(tokenHash))
	}

	public async findTokenHashByUserId(userId: string): Promise<string | null> {
		return this.cacheDB.get<string>(this.makeUidKey(userId))
	}

	public async deleteResetToken(tokenHash: string): Promise<void> {
		await this.cacheDB.delete(this.makeTokenKey(tokenHash))
	}

	public async deleteUidMapping(userId: string): Promise<void> {
		await this.cacheDB.delete(this.makeUidKey(userId))
	}

	private makeTokenKey(tokenHash: string): string {
		return `${TOKEN_PREFIX}:${tokenHash}`
	}

	private makeUidKey(userId: string): string {
		return `${UID_PREFIX}:${userId}`
	}
}
