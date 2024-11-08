import { inject, injectable } from 'inversify'

import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/shared/ioc/types'

import { GymNotFoundError } from '../error/user-not-found-error copy'
import type { GymRepository } from '../repository/gym-repository'

export interface SearchGymUseCaseInput {
  name: string
}

interface CoordinateDTO {
  latitude: number
  longitude: number
}

export interface SearchGymUseCaseResponse {
  id: string
  title: string
  description?: string
  phone?: string
  coordinate: CoordinateDTO
}

export type SearchGymUseCaseOutput = Either<
  GymNotFoundError,
  SearchGymUseCaseResponse
>

@injectable()
export class SearchGymUseCase {
  constructor(
    @inject(TYPES.Repositories.Gym)
    private readonly gymRepository: GymRepository,
  ) {}

  public async execute(
    input: SearchGymUseCaseInput,
  ): Promise<SearchGymUseCaseOutput> {
    const gymOrNull = await this.gymRepository.findByTitle(input.name)
    if (!gymOrNull) return left(new GymNotFoundError())
    return right({
      id: gymOrNull.id!,
      title: gymOrNull.title,
      description: gymOrNull.description,
      phone: gymOrNull.phone,
      coordinate: {
        latitude: gymOrNull.latitude,
        longitude: gymOrNull.longitude,
      },
    })
  }
}
