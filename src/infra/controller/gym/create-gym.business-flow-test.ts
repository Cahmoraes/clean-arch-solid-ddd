import request from 'supertest'
import { createAndSaveUser } from 'test/factory/create-and-save-user'

import type { AuthenticateUseCase } from '@/application/user/use-case/authenticate.usecase'
import { serverBuild } from '@/bootstrap/server-build'
import { RoleValues } from '@/domain/user/value-object/role'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { GymRoutes } from '../routes/gym-routes'
import type { CreateGymPayload } from './create-gym.controller'

describe('Cadastrar Academia', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: InMemoryUserRepository
  let gymRepository: InMemoryGymRepository
  let authenticate: AuthenticateUseCase

  beforeEach(async () => {
    container.snapshot()
    gymRepository = new InMemoryGymRepository()
    userRepository = new InMemoryUserRepository()
    await container.unbind(TYPES.Repositories.User)
    container.bind(TYPES.Repositories.User).toConstantValue(userRepository)
    await container.unbind(TYPES.Repositories.Gym)
    container.bind(TYPES.Repositories.Gym).toConstantValue(gymRepository)
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

  test('Deve criar uma academia', async () => {
    const userInputDto = {
      email: 'user@email.com',
      password: 'password',
      role: RoleValues.ADMIN,
    }
    await createAndSaveUser({
      userRepository,
      ...userInputDto,
    })
    const authenticateOrError = await authenticate.execute({
      email: userInputDto.email,
      password: userInputDto.password,
    })
    const { token } = authenticateOrError.forceSuccess().value
    const input: CreateGymPayload = {
      title: 'Academia Teste',
      description: 'Academia de teste',
      phone: '123456789',
      latitude: 0,
      longitude: 0,
    }
    const response = await request(fastifyServer.server)
      .post(GymRoutes.CREATE)
      .auth(token, { type: 'bearer' })
      .send(input)

    expect(response.body.message).toBe('Gym created')
    expect(response.body.id).toBeDefined()
  })
})
