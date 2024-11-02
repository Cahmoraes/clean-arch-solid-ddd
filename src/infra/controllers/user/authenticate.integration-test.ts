import request from 'supertest'
import { serverBuild } from 'tests/server-build'

import type { UserRepository } from '@/application/repository/user-repository'
import { User } from '@/domain/user'
import { StatusCode } from '@/infra/controllers/status-code'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { UserRoutes } from '../routes/user-routes'

describe('Create User', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: UserRepository

  beforeEach(async () => {
    const inMemoryRepository = new InMemoryUserRepository()
    container.snapshot()
    container.unbind(TYPES.UserRepository)
    container.bind(TYPES.UserRepository).toConstantValue(inMemoryRepository)
    userRepository = container.get<UserRepository>(TYPES.UserRepository)
    fastifyServer = serverBuild()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await new FastifyAdapter().close()
  })

  test('Deve criar um usuário', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }

    const result = await request(fastifyServer.server)
      .post(UserRoutes.CREATE_USER)
      .send(input)

    expect(result.status).toBe(StatusCode.CREATED())
    expect(result.body).toEqual({
      message: 'User created',
      email: input.email,
    })
  })

  test('Deve retornar 409 se o usuário já existir', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }

    const user = User.create(input)
    await userRepository.create(user)

    const result = await request(fastifyServer.server)
      .post(UserRoutes.CREATE_USER)
      .send(input)

    expect(result.status).toBe(StatusCode.CONFLICT())
    expect(result.body).toEqual({
      message: 'User already exists',
    })
  })
})
