import { inject, injectable } from 'inversify'

import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { TYPES } from '@/shared/infra/ioc/types'

import type { SessionDAO } from '../dao/session-dao'
import { SessionNotFoundError } from '../error/session-not-found-error'

export interface LogoutUseCaseInput {
  sessionId: string
}

export type LogoutUseCaseOutput = Either<Error, null>

@injectable()
export class LogoutUseCase {
  constructor(
    @inject(TYPES.DAO.Session)
    private readonly sessionDAO: SessionDAO,
  ) {}

  public async execute(
    input: LogoutUseCaseInput,
  ): Promise<LogoutUseCaseOutput> {
    const session = await this.sessionDAO.sessionById(input.sessionId)
    if (!session) return failure(new SessionNotFoundError(input.sessionId))
    await this.sessionDAO.delete(session)
    return success(null)
  }
}
