import request from 'supertest'

import type { UserRepository } from '@/application/repository/user-repository'
import { serverBuild } from '@/bootstrap/server-build'
import { User } from '@/domain/user'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { UserRoutes } from '../routes/user-routes'

describe('Refresh Token', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: UserRepository

  beforeEach(async () => {
    const inMemoryRepository = new InMemoryUserRepository()
    container.snapshot()
    container
      .rebind<UserRepository>(TYPES.Repositories.User)
      .toConstantValue(inMemoryRepository)
    userRepository = container.get<UserRepository>(TYPES.Repositories.User)
    fastifyServer = serverBuild()
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
    await userRepository.save(user.forceRight().value)

    const responseAuthenticate = await request(fastifyServer.server)
      .post(UserRoutes.AUTHENTICATE)
      .send({
        email: input.email,
        password: input.password,
      })

    console.log(responseAuthenticate.body)

    const refreshToken = responseAuthenticate.headers['set-cookie'][0]

    const responseRefreshToken = await request(fastifyServer.server)
      .patch(UserRoutes.REFRESH)
      .set('Cookie', refreshToken)
      .send()

    console.log(responseRefreshToken.body)
  })
})
