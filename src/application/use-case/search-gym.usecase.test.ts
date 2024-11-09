import { createAndSaveGym } from 'test/factory/create-and-save-gym'
import { setupInMemoryRepositories } from 'test/factory/setup-in-memory-repositories'

import { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

import { GymNotFoundError } from '../error/user-not-found-error copy'
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
    const gym = result.forceRight().value
    expect(gym.id).toBeDefined()
    expect(gym.title).toBe('Academia Teste')
    expect(gym.description).toBe('Academia Teste descrição')
    expect(gym.phone).toBe('999999999')
    expect(gym.coordinate).toEqual({
      latitude: -23.563099,
      longitude: -46.656571,
    })
  })

  test('Deve retornar GymNotFoundError se não encontrar a academia', async () => {
    const input: SearchGymUseCaseInput = {
      name: 'Academia Teste',
    }
    const result = await sut.execute(input)
    expect(result.value).toBeInstanceOf(GymNotFoundError)
  })
})
