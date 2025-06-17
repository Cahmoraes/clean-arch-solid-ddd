import request from 'supertest'
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { serverBuildForTest } from 'test/factory/server-build-for-test'

import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/shared/infra/server/http-status'
import type { AuthenticateUseCase } from '@/session/application/use-case/authenticate.usecase'

import { UserRoutes } from './routes/user-routes'

describe('Obter Meu Perfil', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let authenticate: AuthenticateUseCase

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository()
    container.snapshot()

    container
      .rebindSync(TYPES.Repositories.User)
      .toConstantValue(userRepository)
    authenticate = container.get<AuthenticateUseCase>(
      TYPES.UseCases.Authenticate,
    )
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve obter o perfil de um usuário', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
    }
    const user = await createAndSaveUser({
      userRepository,
      ...input,
    })
    const userId = user!.id!
    const result = await authenticate.execute({
      email: input.email,
      password: input.password,
    })
    const token = result.force.success().value.token
    const response = await request(fastifyServer.server)
      .get(UserRoutes.ME)
      .set('Authorization', `Bearer ${token}`)
      .send()

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body).toHaveProperty('id')
    expect(response.body).toHaveProperty('name')
    expect(response.body).toHaveProperty('email')
    expect(response.body).toEqual({
      id: userId,
      name: input.name,
      email: input.email,
    })
  })

  test('Não deve obter o perfil de um usuário inexistente', async () => {
    const response = await request(fastifyServer.server)
      .get(UserRoutes.ME)
      .send()
    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toEqual('Unauthorized')
    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
