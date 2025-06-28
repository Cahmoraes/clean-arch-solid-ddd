import { inject, injectable } from 'inversify'

import type { InvalidLatitudeError } from '@/check-in/domain/error/invalid-latitude-error'
import type { InvalidLongitudeError } from '@/check-in/domain/error/invalid-longitude-error'
import { Coordinate } from '@/check-in/domain/value-object/coordinate'
import type { Gym } from '@/gym/domain/gym'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { TYPES } from '@/shared/infra/ioc/types'

import type { GymRepository } from '../repository/gym-repository'

export interface FetchNearbyGymInput {
  userLatitude: number
  userLongitude: number
}

export interface FetchNearbyGymOutput {
  id: string
  title: string
  description?: string
  latitude: number
  longitude: number
  phone: string
}

export type FetchNearbyGymResponse = Either<
  InvalidLatitudeError | InvalidLongitudeError,
  FetchNearbyGymOutput[]
>

@injectable()
export class FetchNearbyGym {
  constructor(
    @inject(TYPES.Repositories.Gym)
    private readonly gymRepository: GymRepository,
  ) {}

  public async execute(
    input: FetchNearbyGymInput,
  ): Promise<FetchNearbyGymResponse> {
    const coordOrError = Coordinate.create({
      latitude: input.userLatitude,
      longitude: input.userLongitude,
    })
    if (coordOrError.isFailure()) return failure(coordOrError.value)
    const gyms = await this.gymRepository.fetchNearbyCoord(coordOrError.value)
    return success(this.createGymsDTO(gyms))
  }

  private createGymsDTO(gym: Gym[]): FetchNearbyGymOutput[] {
    return gym.map((gym) => ({
      id: gym.id!,
      title: gym.title,
      description: gym.description,
      latitude: gym.latitude,
      longitude: gym.longitude,
      phone: gym.phone ?? '',
    }))
  }
}
