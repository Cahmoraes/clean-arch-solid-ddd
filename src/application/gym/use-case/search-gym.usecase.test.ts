import { createAndSaveGym } from 'test/factory/create-and-save-gym'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import {
  SearchGymUseCase,
  type SearchGymUseCaseInput,
} from './search-gym.usecase'

describe('SearchGymUseCase', () => {
  let sut: SearchGymUseCase
  let gymRepository: InMemoryGymRepository

  beforeEach(() => {
    container.snapshot()
    gymRepository = setupInMemoryRepositories().gymRepository
    sut = container.get(TYPES.UseCases.SearchGym)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve buscar uma academia pelo nome', async () => {
    const input: SearchGymUseCaseInput = {
      name: 'Academia Teste',
    }
    await createAndSaveGym({
      id: '1',
      gymRepository,
      title: 'Academia Teste',
      description: 'Academia Teste descrição',
      phone: '999999999',
      latitude: -23.563099,
      longitude: -46.656571,
    })
    const result = await sut.execute(input)
    const gym = result[0]
    expect(gym.id).toBeDefined()
    expect(gym.title).toBe('Academia Teste')
    expect(gym.description).toBe('Academia Teste descrição')
    expect(gym.phone).toBe(999999999)
    expect(gym.coordinate).toEqual({
      latitude: -23.563099,
      longitude: -46.656571,
    })
  })

  test('Deve paginar academias', async () => {
    const input: SearchGymUseCaseInput = {
      name: 'Academia Teste',
      page: 2,
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
    const result = await sut.execute(input)
    expect(result).toHaveLength(3)
    expect(result[0].title).toBe('Academia Teste 20')
    expect(result[1].title).toBe('Academia Teste 21')
    expect(result[2].title).toBe('Academia Teste 22')
  })
})
