import request from 'supertest'

import type { UserRepository } from '@/application/repository/user-repository'
import { serverBuild } from '@/bootstrap/server-build'
import { User } from '@/domain/user'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/infra/server/http-status'

import { UserRoutes } from '../routes/user-routes'

describe('Create User', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: UserRepository

  beforeEach(async () => {
    const inMemoryRepository = new InMemoryUserRepository()
    container.snapshot()
    container.unbind(TYPES.Repositories.User)
    container.bind(TYPES.Repositories.User).toConstantValue(inMemoryRepository)
    userRepository = container.get<UserRepository>(TYPES.Repositories.User)
    fastifyServer = serverBuild()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve criar um usuário', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }

    const result = await request(fastifyServer.server)
      .post(UserRoutes.CREATE)
      .send(input)

    expect(result.status).toBe(HTTP_STATUS.CREATED)
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
    await userRepository.save(user.forceSuccess().value)

    const response = await request(fastifyServer.server)
      .post(UserRoutes.CREATE)
      .send(input)

    expect(response.status).toBe(HTTP_STATUS.CONFLICT)
    expect(response.body).toEqual({
      message: 'User already exists',
    })
  })

  test('Não deve criar um usuário com dados inválidos', async () => {
    const input = {
      name: 'any_name',
      email: 'invalid_email',
      password: 'any_password',
    }

    const result = await request(fastifyServer.server)
      .post(UserRoutes.CREATE)
      .send(input)

    expect(result.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(result.body).toEqual({
      message: 'Validation error: Invalid email at "email"',
    })
  })
})
