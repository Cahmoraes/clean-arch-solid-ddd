import { injectable } from "inversify"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store.js"

@injectable()
export class InMemoryPasswordResetTokenStore
	implements PasswordResetTokenStore
{
	private tokenToUser = new Map<string, string>()
	private userToToken = new Map<string, string>()

	public async saveResetToken(
		userId: string,
		tokenHash: string,
		_ttl: number,
	): Promise<void> {
		this.tokenToUser.set(tokenHash, userId)
	}

	public async saveUidMapping(
		userId: string,
		tokenHash: string,
		_ttl: number,
	): Promise<void> {
		this.userToToken.set(userId, tokenHash)
	}

	public async findUserIdByTokenHash(
		tokenHash: string,
	): Promise<string | null> {
		return this.tokenToUser.get(tokenHash) ?? null
	}

	public async findTokenHashByUserId(userId: string): Promise<string | null> {
		return this.userToToken.get(userId) ?? null
	}

	public async deleteResetToken(tokenHash: string): Promise<void> {
		this.tokenToUser.delete(tokenHash)
	}

	public async deleteUidMapping(userId: string): Promise<void> {
		this.userToToken.delete(userId)
	}

	public clear(): void {
		this.tokenToUser.clear()
		this.userToToken.clear()
	}
}
