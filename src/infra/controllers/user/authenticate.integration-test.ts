import request from 'supertest'

import type { UserRepository } from '@/application/repository/user-repository'
import { serverBuild } from '@/bootstrap/server-build'
import { User } from '@/domain/user'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory-repository'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/infra/server/http-status'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import { UserRoutes } from '../routes/user-routes'

describe('Authenticate User', () => {
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

  test('Deve autenticar um usuário', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }

    const user = User.create(input)
    await userRepository.save(user.forceRight().value)

    const response = await request(fastifyServer.server)
      .post(UserRoutes.AUTHENTICATE)
      .send({
        email: input.email,
        password: input.password,
      })

    expect(response.body).toHaveProperty('token')
    expect(response.body.token).toEqual(expect.any(String))
    expect(response.status).toBe(HTTP_STATUS.OK)
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
