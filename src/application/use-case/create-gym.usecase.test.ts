import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

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
    expect(result.forceRight().value.gymId).toEqual(expect.any(String))
  })
})
