import { inject, injectable } from 'inversify'

import type { InvalidLatitudeError } from '@/domain/check-in/error/invalid-latitude-error'
import type { InvalidLongitudeError } from '@/domain/check-in/error/invalid-longitude-error'
import { Coordinate } from '@/domain/check-in/value-object/coordinate'
import type { Gym } from '@/domain/gym/gym'
import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'
import { TYPES } from '@/infra/ioc/types'

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
  phone?: number
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
      phone: gym.phone,
    }))
  }
}
