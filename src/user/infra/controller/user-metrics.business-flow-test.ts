import request from 'supertest'
import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { serverBuildForTest } from 'test/factory/server-build-for-test'

import type { AuthenticateUseCase } from '@/user/application/use-case/authenticate.usecase'
import { InMemoryCheckInRepository } from '@/shared/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'

import { UserRoutes } from './routes/user-routes'

describe('Obter Métricas do Usuário', () => {
  let fastifyServer: FastifyAdapter
  let checkInRepository: InMemoryCheckInRepository
  let authenticate: AuthenticateUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository()
    container.snapshot()
    container
      .rebindSync(TYPES.Repositories.User)
      .toConstantValue(userRepository)
    checkInRepository = new InMemoryCheckInRepository()
    container
      .rebindSync(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
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

  test('Deve retornar a quantidade de 0 check-ins do usuário', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
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
      .get(UserRoutes.METRICS)
      .set('Authorization', `Bearer ${token}`)

    expect(response.body.checkInsCount).toBe(0)
  })

  test('Deve retornar a quantidade de 1 check-ins do usuário', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
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

    await createAndSaveCheckIn({
      checkInRepository,
      id: '1',
      userId: user.id!,
      gymId: 'gymId1',
      userLatitude: 0,
      userLongitude: 0,
    })

    const response = await request(fastifyServer.server)
      .get(UserRoutes.METRICS)
      .set('Authorization', `Bearer ${token}`)

    expect(response.body.checkInsCount).toBe(1)
  })

  test('Deve retornar a quantidade de 10 check-ins do usuário', async () => {
    const input = {
      name: 'any_name',
      email: 'any@email.com',
      password: 'any_password',
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

    for (let i = 0; i < 10; i++) {
      await createAndSaveCheckIn({
        checkInRepository,
        id: i.toString(),
        userId: user.id!,
        gymId: 'gymId1',
        userLatitude: 0,
        userLongitude: 0,
      })
    }

    const response = await request(fastifyServer.server)
      .get(UserRoutes.METRICS)
      .set('Authorization', `Bearer ${token}`)

    expect(response.body.checkInsCount).toBe(10)
  })
})
