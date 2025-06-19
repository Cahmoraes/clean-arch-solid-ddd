import request from 'supertest'
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { serverBuildForTest } from 'test/factory/server-build-for-test'

import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { env } from '@/shared/infra/env'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

import { SessionRoutes } from './routes/session-routes'

describe('Logout Usuário', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    const inMemoryRepository = new InMemoryUserRepository()
    container.snapshot()
    container
      .rebindSync(TYPES.Repositories.User)
      .toConstantValue(inMemoryRepository)
    userRepository = container.get<InMemoryUserRepository>(
      TYPES.Repositories.User,
    )
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve fazer logout de um usuário autenticado', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }
    await createAndSaveUser({
      userRepository,
      ...input,
    })

    // First, authenticate the user to get tokens
    const authResponse = await request(fastifyServer.server)
      .post(SessionRoutes.AUTHENTICATE)
      .send({
        email: input.email,
        password: input.password,
      })

    expect(authResponse.status).toBe(HTTP_STATUS.OK)
    const token = authResponse.body.token

    // Now logout with the token
    const logoutResponse = await request(fastifyServer.server)
      .post(SessionRoutes.LOGOUT)
      .set('Authorization', `Bearer ${token}`)

    expect(logoutResponse.status).toBe(HTTP_STATUS.NO_CONTENT)
    expect(logoutResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${env.REFRESH_TOKEN_NAME}=; `),
      ]),
    )
  })

  test('Não deve fazer logout se o usuário não estiver autenticado', async () => {
    const logoutResponse = await request(fastifyServer.server).post(
      SessionRoutes.LOGOUT,
    )

    expect(logoutResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  test('Deve retornar erro se tentar fazer logout de uma sessão já revogada', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }
    await createAndSaveUser({
      userRepository,
      ...input,
    })

    // First, authenticate the user to get tokens
    const authResponse = await request(fastifyServer.server)
      .post(SessionRoutes.AUTHENTICATE)
      .send({
        email: input.email,
        password: input.password,
      })

    expect(authResponse.status).toBe(HTTP_STATUS.OK)
    const token = authResponse.body.token

    // First logout should succeed
    const firstLogoutResponse = await request(fastifyServer.server)
      .post(SessionRoutes.LOGOUT)
      .set('Authorization', `Bearer ${token}`)

    expect(firstLogoutResponse.status).toBe(HTTP_STATUS.NO_CONTENT)

    // Second logout with same token should fail
    const secondLogoutResponse = await request(fastifyServer.server)
      .post(SessionRoutes.LOGOUT)
      .set('Authorization', `Bearer ${token}`)

    expect(secondLogoutResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    expect(secondLogoutResponse.body).toHaveProperty('message')
    expect(secondLogoutResponse.body.message).toEqual('Session already revoked')
  })

  test('Deve retornar erro com token inválido', async () => {
    const invalidToken = 'invalid.token.here'

    const logoutResponse = await request(fastifyServer.server)
      .post(SessionRoutes.LOGOUT)
      .set('Authorization', `Bearer ${invalidToken}`)

    expect(logoutResponse.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
