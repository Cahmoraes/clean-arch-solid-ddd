import { InvalidLatitudeError } from '@/domain/error/invalid-latitude-error'
import { InvalidLongitudeError } from '@/domain/error/invalid-longitude-error'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'

import {
  CreateGymUseCase,
  type CreateGymUseCaseInput,
} from './create-gym.usecase'

describe('CreateGymUseCase', () => {
  let sut: CreateGymUseCase

  beforeEach(() => {
    container.snapshot()
    sut = container.get(TYPES.UseCases.CreateGym)
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
    }
    const result = await sut.execute(input)
    expect(result.forceSuccess().value.gymId).toEqual(expect.any(String))
  })

  test('Deve falhar ao criar uma Academia sem título', async () => {
    const input: CreateGymUseCaseInput = {
      title: '',
      description: 'fake description',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: '11971457899',
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
    }
    const result = await sut.execute(input)
    expect(result.isFailure()).toBe(true)
  })
})
