import request from 'supertest'
import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'
import { createAndSaveUser } from 'test/factory/create-and-save-user'

import type { AuthenticateUseCase } from '@/application/user/use-case/authenticate.usecase'
import { serverBuild } from '@/bootstrap/server-build'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/infra/database/repository/in-memory/in-memory-user-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { UserRoutes } from '../routes/user-routes'

describe('Obter Métricas do Usuário', () => {
  let fastifyServer: FastifyAdapter
  let checkInRepository: InMemoryCheckInRepository
  let authenticate: AuthenticateUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository()
    container.snapshot()
    await container.unbind(TYPES.Repositories.User)
    container.bind(TYPES.Repositories.User).toConstantValue(userRepository)
    checkInRepository = new InMemoryCheckInRepository()
    await container.unbind(TYPES.Repositories.CheckIn)
    container
      .bind(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
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
