import { inject, injectable } from 'inversify'

import { Gym } from '@/domain/gym'
import { TYPES } from '@/shared/ioc/types'

import type { GymRepository } from '../repository/gym-repository'

export interface CreateGymUseCaseInput {
  title: string
  description?: string
  phone?: string
  latitude: number
  longitude: number
}

export type CreateGymUseCaseOutput = any

@injectable()
export class CreateGymUseCase {
  constructor(
    @inject(TYPES.Repositories.Gym)
    private readonly gymRepository: GymRepository,
  ) {}

  public async execute(
    input: CreateGymUseCaseInput,
  ): Promise<CreateGymUseCaseOutput> {
    const gymOrNull = await this.gymRepository.findByTitle(input.title)
    if (gymOrNull) throw new Error('Gym already exists')
    const gym = Gym.create(input)
    await this.gymRepository.save(gym)
    return ''
  }
}
