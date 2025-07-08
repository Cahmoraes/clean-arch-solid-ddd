export interface RevokedTokenData {
  jwi: string
  userId: string
  revokedAt: string
  expiresIn: string
}

export interface RevokedTokenDAO {
  revokedTokenById(id: string): Promise<RevokedTokenData | null>
  revoke(session: RevokedTokenData, ttl?: number): Promise<void>
  delete(session: RevokedTokenData): Promise<void>
}
