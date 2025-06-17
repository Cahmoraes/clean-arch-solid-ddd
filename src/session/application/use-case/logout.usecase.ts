import { inject, injectable } from 'inversify'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { env } from '@/shared/infra/env'
import { TYPES } from '@/shared/infra/ioc/types'

import type { SessionDAO, SessionData } from '../dao/session-dao'
import { SessionRevokedError } from '../error/session-revoked-error'

export interface LogoutUseCaseInput {
  jwi: string
  userId: string
}

export type LogoutUseCaseOutput = Either<SessionRevokedError, SessionData>

interface createAndSaveSessionProps {
  userId: string
  jwi: string
}

@injectable()
export class LogoutUseCase {
  constructor(
    @inject(TYPES.DAO.Session)
    private readonly sessionDAO: SessionDAO,
  ) {}

  public async execute(
    input: LogoutUseCaseInput,
  ): Promise<LogoutUseCaseOutput> {
    const foundSession = await this.sessionDAO.sessionById(input.jwi)
    if (foundSession) return failure(new SessionRevokedError())
    const sessionData = this.createSession(input)
    await this.sessionDAO.create(sessionData)
    return success(sessionData)
  }

  private createSession({
    jwi,
    userId,
  }: createAndSaveSessionProps): SessionData {
    return {
      jwi,
      userId,
      createdAt: new Date().toISOString(),
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }
  }
}
