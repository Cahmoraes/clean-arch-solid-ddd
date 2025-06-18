export interface SessionData {
  jwi: string
  userId: string
  createdAt: string
  expiresIn: string
}

export interface SessionDAO {
  sessionById(id: string): Promise<SessionData | null>
  create(session: SessionData, ttl?: number): Promise<void>
  delete(session: SessionData): Promise<void>
}
