import request from 'supertest'
import { createAndSaveUser } from 'test/factory/create-and-save-user'

import type { UserRepository } from '@/application/user/repository/user-repository'
import type { AuthenticateUseCase } from '@/application/user/use-case/authenticate.usecase'
import { serverBuild } from '@/bootstrap/server-build'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/infra/server/http-status'

import { UserRoutes } from '../routes/user-routes'

describe('Obter Meu Perfil', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let authenticate: AuthenticateUseCase

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository()
    container.snapshot()
    await container.unbind(TYPES.Repositories.User)
    container
      .bind<UserRepository>(TYPES.Repositories.User)
      .toConstantValue(userRepository)
    authenticate = container.get<AuthenticateUseCase>(
      TYPES.UseCases.Authenticate,
    )
    fastifyServer = await serverBuild()
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
