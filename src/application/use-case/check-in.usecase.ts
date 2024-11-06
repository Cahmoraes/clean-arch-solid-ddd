import { inject, injectable } from 'inversify'

import { CheckIn } from '@/domain/check-in'
import { CalculateDistance } from '@/domain/service/calculate-distance'
import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/shared/ioc/types'

import { UserHasAlreadyCheckedInToday } from '../error/user-has-already-checked-in-today'
import { UserNotFoundError } from '../error/user-not-found-error'
import { GymNotFoundError } from '../error/user-not-found-error copy'
import type { CheckInRepository } from '../repository/check-in-repository'
import type { GymRepository } from '../repository/gym-repository'
import type { UserRepository } from '../repository/user-repository'

export interface CheckInUseCaseInput {
  userId: string
  gymId: string
  userLatitude: number
  userLongitude: number
}
export interface CheckInUseCaseResponse {
  checkInId: string
  date: Date
}

interface Coordinate {
  latitude: number
  longitude: number
}

export type CheckInUseCaseOutput = Either<Error, CheckInUseCaseResponse>

@injectable()
export class CheckInUseCase {
  private readonly MAX_DISTANCE_IN_KM = 0.1

  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(TYPES.Repositories.Gym)
    private readonly gymRepository: GymRepository,
    @inject(TYPES.Repositories.CheckIn)
    private readonly checkInRepository: CheckInRepository,
  ) {}

  public async execute(
    input: CheckInUseCaseInput,
  ): Promise<CheckInUseCaseOutput> {
    const userOrNull = await this.userRepository.findById(input.userId)
    if (!userOrNull) return left(new UserNotFoundError())
    const checkInOnSameDate = await this.hasCheckInOnSameDate()
    if (checkInOnSameDate) return left(new UserHasAlreadyCheckedInToday())
    const gymOrNull = await this.gymRepository.findById(input.gymId)
    if (!gymOrNull) return left(new GymNotFoundError())
    const differenceInDistance = this.distanceBetweenCoords(
      {
        latitude: input.userLatitude,
        longitude: input.userLongitude,
      },
      {
        latitude: gymOrNull.latitude,
        longitude: gymOrNull.longitude,
      },
    )
    if (differenceInDistance > this.MAX_DISTANCE_IN_KM) {
      return left(new Error('Distance too far'))
    }
    const checkIn = CheckIn.create(input)
    const { id } = await this.checkInRepository.save(checkIn)
    return right({
      checkInId: id,
      date: checkIn.createdAt,
    })
  }

  private async hasCheckInOnSameDate(): Promise<boolean> {
    const today = new Date()
    const checkInOnSameDate = await this.checkInRepository.onSameDate(today)
    return checkInOnSameDate
  }

  private distanceBetweenCoords(
    userCoord: Coordinate,
    gymCoord: Coordinate,
  ): number {
    return CalculateDistance.distanceBetweenCoordinates(userCoord, gymCoord)
  }
}
