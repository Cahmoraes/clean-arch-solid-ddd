import { inject, injectable } from 'inversify'

import { CheckIn } from '@/domain/check-in'
import { DistanceCalculator } from '@/domain/service/distance-calculator'
import { type Either, failure, success } from '@/domain/value-object/either'
import { TYPES } from '@/infra/ioc/types'

import { MaxDistanceError } from '../error/max-distance-error'
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
    const userOrNull = await this.userRepository.userOfId(input.userId)
    if (!userOrNull) return failure(new UserNotFoundError())
    const checkInOnSameDate = await this.hasCheckInOnSameDate()
    if (checkInOnSameDate) return failure(new UserHasAlreadyCheckedInToday())
    const gymOrNull = await this.gymRepository.findById(input.gymId)
    if (!gymOrNull) return failure(new GymNotFoundError())
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
    if (this.isDistanceExceeded(differenceInDistance)) {
      return failure(new MaxDistanceError())
    }
    const checkIn = CheckIn.create(input)
    const { id } = await this.checkInRepository.save(checkIn)
    return success({
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
    return DistanceCalculator.distanceBetweenCoordinates(userCoord, gymCoord)
  }

  private isDistanceExceeded(differenceInDistance: number): boolean {
    return differenceInDistance > this.MAX_DISTANCE_IN_KM
  }
}
