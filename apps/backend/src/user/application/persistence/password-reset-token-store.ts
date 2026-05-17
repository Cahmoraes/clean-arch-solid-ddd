export interface PasswordResetTokenStore {
	saveResetToken(userId: string, tokenHash: string, ttl: number): Promise<void>
	saveUidMapping(userId: string, tokenHash: string, ttl: number): Promise<void>
	findUserIdByTokenHash(tokenHash: string): Promise<string | null>
	findTokenHashByUserId(userId: string): Promise<string | null>
	deleteResetToken(tokenHash: string): Promise<void>
	deleteUidMapping(userId: string): Promise<void>
}
