import request from 'supertest'
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { serverBuildForTest } from 'test/factory/server-build-for-test'

import type { AuthenticateUseCase } from '@/application/user/use-case/authenticate.usecase'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/infra/server/http-status'

import { UserRoutes } from '../routes/user-routes'

describe('Alterar Senha', () => {
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

  test('Deve alterar a senha de um usuário', async () => {
    const oldPassword = 'old_password'
    const newPassword = 'new_password'
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: oldPassword,
    }
    const user = await createAndSaveUser({
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

    expect(response.status).toBe(HTTP_STATUS.NO_CONTENT)
    expect(user.checkPassword(newPassword)).toBeTruthy()
    expect(user.checkPassword(oldPassword)).toBeFalsy()
    expect(response.body).toEqual({})
  })

  test('Não deve alterar a senha de um usuário para uma senha inválida', async () => {
    const oldPassword = 'old_password'
    const newPassword = '123'
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: oldPassword,
    }
    const user = await createAndSaveUser({
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

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(user.checkPassword(newPassword)).toBeFalsy()
    expect(user.checkPassword(oldPassword)).toBeTruthy()
    expect(response.body).toMatchObject({
      message:
        'Validation error: String must contain at least 6 character(s) at "newRawPassword"',
    })
  })

  test('Não deve alterar a senha de um usuário para uma senha igual a anterior', async () => {
    const oldPassword = 'same_password'
    const newPassword = 'same_password'
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: oldPassword,
    }
    const user = await createAndSaveUser({
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

    expect(response.status).toBe(HTTP_STATUS.CONFLICT)
    expect(user.checkPassword(newPassword)).toBeTruthy()
    expect(user.checkPassword(oldPassword)).toBeTruthy()
    expect(response.body).toMatchObject({
      message: 'The new password must be different from the old password.',
    })
  })
})
