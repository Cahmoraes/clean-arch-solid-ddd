import request from 'supertest'
import { serverBuildForTest } from 'test/factory/server-build-for-test'

import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'
import type { UserRepository } from '@/user/application/repository/user-repository'
import { User } from '@/user/domain/user'

import { UserRoutes } from './routes/user-routes'

describe('Atualizar Refresh Token', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: UserRepository

  beforeEach(async () => {
    container.snapshot()
    const inMemoryUserRepository = new InMemoryUserRepository()
    container
      .rebindSync(TYPES.Repositories.User)
      .toConstantValue(inMemoryUserRepository)
    userRepository = inMemoryUserRepository
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve gerar um novo Refresh Token', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }

    const user = User.create(input)
    await userRepository.save(user.forceSuccess().value)

    const responseAuthenticate = await request(fastifyServer.server)
      .post(UserRoutes.AUTHENTICATE)
      .send({
        email: input.email,
        password: input.password,
      })
    const refreshToken = responseAuthenticate.headers['set-cookie'][0]
    const responseRefreshToken = await request(fastifyServer.server)
      .patch(UserRoutes.REFRESH)
      .set('Cookie', refreshToken)
      .send()
    expect(responseRefreshToken.status).toBe(200)
    expect(responseRefreshToken.body.message).toEqual(expect.any(String))
  })
})
