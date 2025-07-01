import { RedisSessionDAO } from '@/shared/infra/database/dao/redis/redis-session-dao'
import { env } from '@/shared/infra/env'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'

import { SessionRevokedError } from '../error/session-revoked-error'
import { LogoutUseCase, type LogoutUseCaseInput } from './logout.usecase'

describe('LogoutUseCase', () => {
  let sut: LogoutUseCase
  let sessionDAO: RedisSessionDAO

  beforeEach(() => {
    container.snapshot()
    container
      .rebindSync(AUTH_TYPES.DAO.Session)
      .to(RedisSessionDAO)
      .inSingletonScope()
    sut = container.get(AUTH_TYPES.UseCases.Logout)

    // const redisSessionDAO = container.get(RedisSessionDAO, { autobind: true })
    sessionDAO = container.get(AUTH_TYPES.DAO.Session)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve fazer o logout de uma sessão válida', async () => {
    const userId = 'any-user-id'
    const jwi = 'any-jwi'
    const input: LogoutUseCaseInput = {
      jwi,
      userId,
    }
    const sessionResult = await sut.execute(input)
    expect(sessionResult.isSuccess()).toBe(true)
    const sessionData = await sessionDAO.sessionById(input.jwi)
    expect(sessionData!.jwi).toBe(input.jwi)
    expect(sessionData!.userId).toBe(input.userId)
    expect(sessionData!.expiresIn).toBe(env.JWT_REFRESH_EXPIRES_IN)
  })

  test('Deve retornar um "failure" ao tentar fazer o logout de uma sessão já existente', async () => {
    const userId = 'any-user-id'
    const jwi = 'existing-jwi'
    await sessionDAO.create({
      jwi,
      userId,
      createdAt: new Date().toISOString(),
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    })
    const input: LogoutUseCaseInput = {
      jwi,
      userId,
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(SessionRevokedError)
  })
})
