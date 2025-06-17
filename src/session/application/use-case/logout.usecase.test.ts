import type { SessionDAOMemory } from '@/shared/infra/database/dao/in-memory/session-dao-memory'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'

import type { SessionData } from '../dao/session-dao'
import { SessionNotFoundError } from '../error/session-not-found-error'
import { LogoutUseCase, type LogoutUseCaseInput } from './logout.usecase'

describe('LogoutUseCase', () => {
  let sut: LogoutUseCase
  let sessionDAO: SessionDAOMemory

  beforeEach(() => {
    container.snapshot()
    sut = container.get(TYPES.UseCases.Logout)
    sessionDAO = container.get(TYPES.DAO.Session)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve fazer o logout de uma sessão válida', async () => {
    const sessionId = 'any-session-id'
    const sessionData: SessionData = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      expiresIn: '1d',
      userId: 'any-user-id',
    }
    await sessionDAO.create(sessionData)
    const input: LogoutUseCaseInput = {
      sessionId,
    }
    const result = await sut.execute(input)
    expect(result.value).toBe(null)
    const hasSession = await sessionDAO.sessionById(sessionId)
    expect(hasSession).toBeFalsy()
  })

  test('Deve retornar um "failure" ao tentar fazer o logout de um sessão inexistente', async () => {
    const input: LogoutUseCaseInput = {
      sessionId: 'any-session-id',
    }
    const result = await sut.execute(input)
    expect(result.value).toBeInstanceOf(SessionNotFoundError)
  })
})
