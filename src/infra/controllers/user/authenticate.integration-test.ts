import request from 'supertest'
import { createAndSaveUser } from 'test/factory/create-and-save-user'

import type { User as UserToken } from '@/@types/custom'
import type { UserRepository } from '@/application/repository/user-repository'
import { serverBuild } from '@/bootstrap/server-build'
import { RoleValues } from '@/domain/value-object/role'
import type { JsonWebTokenAdapter } from '@/infra/auth/json-web-token-adapter'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { env } from '@/infra/env'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/infra/server/http-status'

import { UserRoutes } from '../routes/user-routes'

describe('Authenticate User', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let jwtAdapter: JsonWebTokenAdapter

  beforeEach(async () => {
    const inMemoryRepository = new InMemoryUserRepository()
    container.snapshot()
    container
      .rebind<UserRepository>(TYPES.Repositories.User)
      .toConstantValue(inMemoryRepository)
    userRepository = container.get<InMemoryUserRepository>(
      TYPES.Repositories.User,
    )
    jwtAdapter = container.get(TYPES.Tokens.Auth)
    fastifyServer = await serverBuild()
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
      .post(UserRoutes.AUTHENTICATE)
      .send({
        email: input.email,
        password: input.password,
      })
    console.log(response.body)
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
      .post(UserRoutes.AUTHENTICATE)
      .send({
        email: 'inexistent@email.com',
        password: 'inexistent_password',
      })
    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toEqual('Invalid credentials')
    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
