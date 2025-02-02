import { inject, injectable } from 'inversify'

import { Gym } from '@/domain/gym/gym'
import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'
import type { InvalidNameLengthError } from '@/domain/user/error/invalid-name-length-error'
import { TYPES } from '@/infra/ioc/types'

import { GymAlreadyExistsError } from '../error/gym-already-exists-error'
import type { GymRepository } from '../repository/gym-repository'

export interface CreateGymUseCaseInput {
  title: string
  description?: string
  phone?: string
  latitude: number
  longitude: number
}

export interface CreateGymResponse {
  gymId: string
}

export type CreateGymUseCaseOutput = Either<
  InvalidNameLengthError | GymAlreadyExistsError,
  CreateGymResponse
>

@injectable()
export class CreateGymUseCase {
  constructor(
    @inject(TYPES.Repositories.Gym)
    private readonly gymRepository: GymRepository,
  ) {}

  public async execute(
    input: CreateGymUseCaseInput,
  ): Promise<CreateGymUseCaseOutput> {
    const gymOrError = Gym.create(input)
    if (gymOrError.isFailure()) return failure(gymOrError.value)
    const { id } = await this.gymRepository.save(gymOrError.value)
    return success({ gymId: id })
  }
}
