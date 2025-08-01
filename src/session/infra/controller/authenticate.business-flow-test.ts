import request from 'supertest'
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { serverBuildForTest } from 'test/factory/server-build-for-test'

import type { User as UserToken } from '@/@types/custom'
import type { JsonWebTokenAdapter } from '@/shared/infra/auth/json-web-token-adapter'
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { env } from '@/shared/infra/env'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES, USER_TYPES } from '@/shared/infra/ioc/types'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'
import { RoleValues } from '@/user/domain/value-object/role'

import { SessionRoutes } from './routes/session-routes'

describe('Autenticar Usuário', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let jwtAdapter: JsonWebTokenAdapter

  beforeEach(async () => {
    const inMemoryRepository = new InMemoryUserRepository()
    container.snapshot()
    container
      .rebindSync(USER_TYPES.Repositories.User)
      .toConstantValue(inMemoryRepository)
    userRepository = container.get<InMemoryUserRepository>(
      USER_TYPES.Repositories.User,
    )
    jwtAdapter = container.get(SHARED_TYPES.Tokens.Auth)
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve autenticar um usuário', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }
    await createAndSaveUser({
      userRepository,
      ...input,
    })
    const response = await request(fastifyServer.server)
      .post(SessionRoutes.AUTHENTICATE)
      .send({
        email: input.email,
        password: input.password,
      })
    expect(response.headers['set-cookie'][0]).toEqual(expect.any(String))
    expect(response.body).toHaveProperty('token')
    expect(response.status).toBe(HTTP_STATUS.OK)
    const token = response.body.token
    expect(token).toEqual(expect.any(String))
    const tokenSubject = jwtAdapter
      .verify<UserToken>(token, env.PRIVATE_KEY)
      .force.success().value.sub
    expect(tokenSubject.email).toBe(input.email)
    expect(tokenSubject.id).toEqual(expect.any(String))
    expect(tokenSubject.role).toBe(RoleValues.MEMBER)
  })

  test('Não deve autenticar um usuário inválido', async () => {
    const response = await request(fastifyServer.server)
      .post(SessionRoutes.AUTHENTICATE)
      .send({
        email: 'inexistent@email.com',
        password: 'inexistent_password',
      })
    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toEqual('Invalid credentials')
    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
