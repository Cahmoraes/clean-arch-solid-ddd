import { inject, injectable } from 'inversify'

import type { InvalidNameLengthError } from '@/domain/error/invalid-name-length-error'
import { Gym } from '@/domain/gym'
import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/shared/ioc/types'

import { GymAlreadyExistsError } from '../error/gym-alread-exists-error'
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
    const gymOrNull = await this.gymRepository.findByTitle(input.title)
    if (gymOrNull) left(new GymAlreadyExistsError())
    const gymOrError = Gym.create(input)
    if (gymOrError.isLeft()) return left(gymOrError.value)
    const { id } = await this.gymRepository.save(gymOrError.value)
    return right({ gymId: id })
  }
}
