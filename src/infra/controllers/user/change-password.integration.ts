import request from 'supertest'
import { createAndSaveUser } from 'test/factory/create-and-save-user'

import type { UserRepository } from '@/application/repository/user-repository'
import type { AuthenticateUseCase } from '@/application/use-case/authenticate.usecase'
import { serverBuild } from '@/bootstrap/server-build'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/infra/server/http-status'

import { UserRoutes } from '../routes/user-routes'

describe('Change Password', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let authenticate: AuthenticateUseCase

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository()
    container.snapshot()
    container
      .rebind<UserRepository>(TYPES.Repositories.User)
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

  test('Deve alterar a senha de um usuário', async () => {
    const oldPassword = 'old_password'
    const newPassword = 'new_password'
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: oldPassword,
    }
    await createAndSaveUser({
      userRepository,
      ...input,
    })

    const result = await authenticate.execute({
      email: input.email,
      password: input.password,
    })
    const token = result.force.success().value.token
    const response = await request(fastifyServer.server)
      .patch(UserRoutes.CHANGE_PASSWORD)
      .set('Authorization', `Bearer ${token}`)
      .send({
        newRawPassword: newPassword,
      })

    expect(response.status).toBe(HTTP_STATUS.OK)
    console.log(response.body)
  })

  // test('Não deve obter o perfil de um usuário inexistente', async () => {
  //   const response = await request(fastifyServer.server)
  //     .get(UserRoutes.ME)
  //     .send()
  //   expect(response.body).toHaveProperty('message')
  //   expect(response.body.message).toEqual('Unauthorized')
  //   expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  // })
})