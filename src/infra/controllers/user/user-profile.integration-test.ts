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

describe('User Profile', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: UserRepository

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository()
    container.snapshot()
    container
      .rebind<UserRepository>(TYPES.Repositories.User)
      .toConstantValue(userRepository)
    fastifyServer = serverBuild()
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

    const user = User.create(input)
    await userRepository.save(user.forceRight().value)
    const savedUser = await userRepository.findByEmail(input.email)
    console.log({ savedUser })
    const userId = savedUser!.id!
    const response = await request(fastifyServer.server)
      .get(toPath(userId))
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
    console.log(response.body)
  })

  test('Não deve obter o perfil de um usuário inexistente', async () => {
    const response = await request(fastifyServer.server)
      .get(toPath('inexistent_id'))
      .send()
    expect(response.body).toHaveProperty('message')
    expect(response.body.message).toEqual('User not found')
    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  function toPath(userId: string): string {
    return UserRoutes.PROFILE.replace(':userId', userId)
  }
})
