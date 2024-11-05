import request from 'supertest'

import { serverBuild } from '@/bootstrap/server-build'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import { GymRoutes } from '../routes/gym-routes'
import type {
  CreateGymController,
  CreateGymPayload,
  CreateGymUseCaseInput,
} from './create-gym.controller'

describe('Create Gym', () => {
  let fastifyServer: FastifyAdapter
  let gymRepository: InMemoryGymRepository

  beforeEach(async () => {
    container.snapshot()
    gymRepository = new InMemoryGymRepository()
    container.rebind(TYPES.Repositories.Gym).toConstantValue(gymRepository)
    fastifyServer = serverBuild()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  test('Deve criar uma academia', async () => {
    const input: CreateGymPayload = {
      title: 'Academia Teste',
      description: 'Academia de teste',
      phone: '123456789',
      latitude: 0,
      longitude: 0,
    }
    const response = await request(fastifyServer.server)
      .post(GymRoutes.CREATE)
      .send(input)

    expect(response.body.message).toBe('Gym created')
    expect(response.body.id).toBeDefined()
  })
})
