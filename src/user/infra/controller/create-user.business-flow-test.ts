import request from 'supertest'
import { serverBuildForTest } from 'test/factory/server-build-for-test'

import type { UserRepository } from '@/user/application/repository/user-repository'
import { User } from '@/user/domain/user'
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'

import { UserRoutes } from './routes/user-routes'

describe('Cadastrar Usuário', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: UserRepository

  beforeEach(async () => {
    const inMemoryRepository = new InMemoryUserRepository()
    container.snapshot()
    container
      .rebindSync(TYPES.Repositories.User)
      .toConstantValue(inMemoryRepository)
    userRepository = container.get<UserRepository>(TYPES.Repositories.User)
    fastifyServer = await serverBuildForTest()
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

  test('Não deve criar um usuário com dados inválidos para o controller', async () => {
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

  test('Não deve criar um usuário com a propriedade name inválida. Acima de 30 caracteres', async () => {
    const input = {
      name: 'any_name'.repeat(30),
      email: 'john@doe.com',
      password: 'any_password',
    }

    const result = await request(fastifyServer.server)
      .post(UserRoutes.CREATE)
      .send(input)

    expect(result.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY)
    expect(result.body).toEqual({
      message: 'Name must have between 10 and 30 characters',
    })
  })
})
