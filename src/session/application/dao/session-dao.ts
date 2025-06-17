export interface SessionData {
  id: string
  userId: string
  createdAt: string
  expiresIn: string
}

export interface SessionDAO {
  sessionById(id: string): Promise<SessionData | null>
  create(session: SessionData): Promise<void>
}
