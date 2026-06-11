import { injectable } from "inversify"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store.js"

@injectable()
export class InMemoryLoginAttemptStore implements LoginAttemptStore {
	private attempts = new Map<string, number>()
	private locked = new Set<string>()

	public async increment(email: string, _ttlSeconds: number): Promise<number> {
		const current = this.attempts.get(email) ?? 0
		const next = current + 1
		this.attempts.set(email, next)
		return next
	}

	public async deleteFailedAttempts(email: string): Promise<void> {
		this.attempts.delete(email)
	}

	public async setLocked(userId: string): Promise<void> {
		this.locked.add(userId)
	}

	public async isLocked(userId: string): Promise<boolean> {
		return this.locked.has(userId)
	}

	public async deleteLock(userId: string): Promise<void> {
		this.locked.delete(userId)
	}

	public clear(): void {
		this.attempts.clear()
		this.locked.clear()
	}
}
