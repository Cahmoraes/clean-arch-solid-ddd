import request from 'supertest'
import { createAndSaveGym } from 'test/factory/create-and-save-gym'

import { serverBuild } from '@/bootstrap/server-build'
import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { HTTP_STATUS } from '@/infra/server/http-status'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import { GymRoutes } from '../routes/gym-routes'
import type { SearchGymPayload } from './search-gym.controller'

describe('Search Gym', () => {
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

  test('Deve buscar uma academia pelo nome', async () => {
    const input = {
      id: '1',
      title: 'Academia Teste',
      description: 'Academia Teste descrição',
      phone: '999999999',
      latitude: -23.563099,
      longitude: -46.656571,
    }
    const gym = await createAndSaveGym({
      gymRepository,
      ...input,
    })

    const response = await request(fastifyServer.server)
      .get(toPath(input.title))
      .send(input)

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body).toEqual([
      {
        id: gym.id,
        title: gym.title,
        description: gym.description,
        phone: gym.phone,
        coordinate: {
          latitude: gym.latitude,
          longitude: gym.longitude,
        },
      },
    ])
  })

  test('Deve retornar 404 se a academia não for encontrada', async () => {
    const input: SearchGymPayload = {
      name: 'Academia Inexistente',
    }

    const response = await request(fastifyServer.server)
      .get(toPath(input.name))
      .send()

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    expect(response.body).toEqual({
      message: 'Gym not found',
    })
  })

  test('Deve retornar uma lista de academias', async () => {
    const input = {
      id: '1',
      title: 'Academia Teste',
      description: 'Academia Teste descrição',
      phone: '999999999',
      latitude: -23.563099,
      longitude: -46.656571,
    }
    for (let i = 0; i <= 22; i++) {
      await createAndSaveGym({
        id: `gym-${i}`,
        gymRepository,
        title: `Academia Teste ${i}`,
        description: 'Academia Teste descrição',
        phone: '999999999',
        latitude: -23.563099,
        longitude: -46.656571,
      })
    }

    const response = await request(fastifyServer.server)
      .get(toPath(input.title))
      .query({
        page: 2,
      })
      .send(input)

    console.log(response.body)
    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body).toHaveLength(3)
  })

  function toPath(path: string) {
    return GymRoutes.SEARCH.replace(':name', path)
  }
})
