export interface LoginAttemptStore {
	increment(email: string, ttlSeconds: number): Promise<number>
	deleteFailedAttempts(email: string): Promise<void>
	setLocked(userId: string): Promise<void>
	isLocked(userId: string): Promise<boolean>
	deleteLock(userId: string): Promise<void>
}
