import { InvalidLatitudeError } from '@/check-in/domain/error/invalid-latitude-error'
import { InvalidLongitudeError } from '@/check-in/domain/error/invalid-longitude-error'
import type { Gym } from '@/gym/domain/gym'
import { InMemoryGymRepository } from '@/shared/infra/database/repository/in-memory/in-memory-gym-repository'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'

import { GymWithCNPJAlreadyExistsError } from '../error/gym-with-cnpj-already-exists-error'
import {
  CreateGymUseCase,
  type CreateGymUseCaseInput,
} from './create-gym.usecase'

describe('CreateGymUseCase', () => {
  let sut: CreateGymUseCase
  let gymRepository: InMemoryGymRepository

  beforeEach(() => {
    container.snapshot()
    container
      .rebindSync(TYPES.Repositories.Gym)
      .to(InMemoryGymRepository)
      .inSingletonScope()
    sut = container.get(TYPES.UseCases.CreateGym)
    gymRepository = container.get(TYPES.Repositories.Gym)
  })

  afterEach(() => {
    container.restore()
  })

  test('Deve criar uma Academia', async () => {
    const input: CreateGymUseCaseInput = {
      title: 'fake gym',
      description: 'fake description',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: '11971457899',
      cnpj: '11.222.333/0001-81',
    }
    const result = await sut.execute(input)
    const gymId = result.forceSuccess().value.gymId
    expect(gymId).toEqual(expect.any(String))
    const gym = (await gymRepository.gymOfId(gymId)) as NonNullable<Gym>
    expect(gym.id).toEqual(expect.any(String))
    expect(gym.title).toBe(input.title)
    expect(gym.description).toBe(input.description)
    expect(gym.latitude).toBe(input.latitude)
    expect(gym.longitude).toBe(input.longitude)
    expect(gym.cnpj).toBe(input.cnpj)
    expect(gym.phone).toBe(input.phone)
  })

  test('Deve falhar ao criar uma Academia sem título', async () => {
    const input: CreateGymUseCaseInput = {
      title: '',
      description: 'fake description',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: '11971457899',
      cnpj: '11.222.333/0001-81',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
  })

  test('Deve falhar ao criar uma Academia com latitude inválida', async () => {
    const input: CreateGymUseCaseInput = {
      title: 'fake gym',
      description: 'fake description',
      latitude: 999,
      longitude: -46.633308,
      phone: '11971457899',
      cnpj: '11.222.333/0001-81',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
  })

  test('Deve falhar ao criar uma Academia com longitude inválida', async () => {
    const input: CreateGymUseCaseInput = {
      title: 'fake gym',
      description: 'fake description',
      latitude: -23.55052,
      longitude: 999,
      phone: '11971457899',
      cnpj: '11.222.333/0001-81',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidLongitudeError)
  })

  test('Deve falhar ao tentar criar uma Academia com longitude inválida', async () => {
    const input: CreateGymUseCaseInput = {
      title: 'fake gym',
      description: 'fake description',
      latitude: 999,
      longitude: -23.55052,
      phone: '11971457899',
      cnpj: '11.222.333/0001-81',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidLatitudeError)
  })

  test('Deve falhar ao tentar criar uma Academia com telefone inválido', async () => {
    const input: CreateGymUseCaseInput = {
      title: 'fake gym',
      description: 'fake description',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: 'invalid-phone',
      cnpj: '11.222.333/0001-81',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
  })

  test('Deve falhar ao tentar criar uma Academia com telefone inválido', async () => {
    const input: CreateGymUseCaseInput = {
      title: 'fake gym',
      description: 'fake description',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: 'invalid-phone',
      cnpj: '11.222.333/0001-81',
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
  })

  test('Deve falhar ao tentar criar uma Academia com CNPJ existente', async () => {
    const input: CreateGymUseCaseInput = {
      title: 'fake gym',
      description: 'fake description',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: '111111111',
      cnpj: '11.222.333/0001-81',
    }
    await sut.execute(input)
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(GymWithCNPJAlreadyExistsError)
  })
})
