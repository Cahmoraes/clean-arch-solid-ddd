import { createAndSaveGym } from 'test/factory/create-and-save-gym'

import { InMemoryGymRepository } from '@/shared/infra/database/repository/in-memory/in-memory-gym-repository'
import { container } from '@/shared/infra/ioc/container'
import { GYM_TYPES } from '@/shared/infra/ioc/types'

import {
  FetchNearbyGym,
  type FetchNearbyGymInput,
} from './fetch-nearby-gym.usecase'

describe('FetchNearbyGymUsecase', () => {
  let sut: FetchNearbyGym
  let gymRepository: InMemoryGymRepository

  beforeEach(async () => {
    container.snapshot()
    gymRepository = new InMemoryGymRepository()
    await container.unbind(GYM_TYPES.Repositories.Gym)
    container.bind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
    sut = container.get(GYM_TYPES.UseCases.FetchNearbyGym)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve buscar academias próximas', async () => {
    const gymData = {
      title: 'Academia 1',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: '11999999999',
      description: 'Academia de teste',
    }

    await createAndSaveGym({
      gymRepository,
      title: gymData.title,
      latitude: gymData.latitude,
      longitude: gymData.longitude,
      phone: gymData.phone,
      description: 'Academia de teste',
    })

    const input: FetchNearbyGymInput = {
      userLatitude: gymData.latitude,
      userLongitude: gymData.longitude,
    }
    const result = await sut.execute(input)
    const gyms = result.force.success().value
    expect(Array.isArray(gyms)).toBe(true)
    expect(gyms).toHaveLength(1)
    expect(gyms[0].title).toBe(gymData.title)
    expect(gyms[0].phone).toBe(gymData.phone)
    expect(gyms[0].description).toBe(gymData.description)
  })

  test('Deve buscar 3 academias próximas', async () => {
    const gymsData = [
      {
        title: 'Academia 1',
        latitude: -23.55052,
        longitude: -46.633308,
        phone: '11999999999',
        description: 'Academia de teste 1',
      },
      {
        title: 'Academia 2',
        latitude: -23.55152,
        longitude: -46.634308,
        phone: '11999999998',
        description: 'Academia de teste 2',
      },
      {
        title: 'Academia 3',
        latitude: -23.55252,
        longitude: -46.635308,
        phone: '11999999997',
        description: 'Academia de teste 3',
      },
      {
        title: 'Academia 4',
        latitude: -23.56052,
        longitude: -46.640308,
        phone: '11999999996',
        description: 'Academia de teste 4',
      },
    ]

    for (const gymData of gymsData) {
      await createAndSaveGym({
        gymRepository,
        title: gymData.title,
        latitude: gymData.latitude,
        longitude: gymData.longitude,
        phone: gymData.phone,
        description: gymData.description,
      })
    }

    const input: FetchNearbyGymInput = {
      userLatitude: -23.55052,
      userLongitude: -46.633308,
    }
    const result = await sut.execute(input)
    const gyms = result.force.success().value
    expect(gyms).toHaveLength(3)
    expect(gyms.map((gym) => gym.title)).toEqual(
      expect.arrayContaining(['Academia 1', 'Academia 2', 'Academia 3']),
    )
    expect(gymRepository.gyms.toArray()).toHaveLength(4)
  })

  test('Deve retornar erro ao passar uma coordenada inválida', async () => {
    const input: FetchNearbyGymInput = {
      userLatitude: -45,
      userLongitude: 185,
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
  })
})
