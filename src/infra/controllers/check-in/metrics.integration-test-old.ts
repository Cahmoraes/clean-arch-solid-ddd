import request from 'supertest'
import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'

import { serverBuild } from '@/bootstrap/server-build'
import { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { CheckInRoutes } from '../routes/check-in-routes'

describe('Metrics', () => {
  let fastifyServer: FastifyAdapter
  let checkInRepository: InMemoryCheckInRepository

  beforeEach(async () => {
    container.snapshot()
    checkInRepository = new InMemoryCheckInRepository()
    container
      .rebind(TYPES.Repositories.CheckIn)
      .toConstantValue(checkInRepository)
    fastifyServer = serverBuild()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve retornar a quantidade de 0 check-ins do usuário', async () => {
    const userId = '1'
    const response = await request(fastifyServer.server)
      .get(toPath(userId))
      .send({ userId })

    expect(response.body.checkInsCount).toBe(0)
  })

  test('Deve retornar a quantidade de 1 check-ins do usuário', async () => {
    const userId = '1'
    await createAndSaveCheckIn({
      checkInRepository,
      id: '1',
      userId,
      gymId: 'gymId1',
      userLatitude: 0,
      userLongitude: 0,
    })
    const response = await request(fastifyServer.server)
      .get(toPath(userId))
      .send({ userId })

    expect(response.body.checkInsCount).toBe(1)
  })

  test('Deve retornar a quantidade de 10 check-ins do usuário', async () => {
    const userId = '1'
    for (let i = 0; i < 10; i++) {
      await createAndSaveCheckIn({
        checkInRepository,
        id: i.toString(),
        userId,
        gymId: 'gymId1',
        userLatitude: 0,
        userLongitude: 0,
      })
    }
    const response = await request(fastifyServer.server)
      .get(toPath(userId))
      .send({ userId })

    expect(response.body.checkInsCount).toBe(10)
  })

  function toPath(userId: string): string {
    return CheckInRoutes.METRICS.replace(':userId', userId)
  }
})
