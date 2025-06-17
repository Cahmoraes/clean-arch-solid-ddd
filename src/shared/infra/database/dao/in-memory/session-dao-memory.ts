import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type {
  SessionDAO,
  SessionData,
} from '@/session/application/dao/session-dao'

@injectable()
export class SessionDAOMemory implements SessionDAO {
  public sessionsData = new ExtendedSet<SessionData>()

  public async create(session: SessionData): Promise<void> {
    this.sessionsData.add(session)
  }

  public async sessionById(id: string): Promise<SessionData | null> {
    return this.sessionsData.find((session) => id === session.jwi)
  }

  public async delete(session: SessionData): Promise<void> {
    this.sessionsData.delete(session)
  }
}
