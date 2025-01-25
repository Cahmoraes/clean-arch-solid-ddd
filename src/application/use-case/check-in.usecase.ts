import { inject, injectable } from 'inversify'

import { CheckIn } from '@/domain/check-in'
import type { InvalidDistanceError } from '@/domain/error/invalid-distance-error'
import { MaxDistanceSpecification } from '@/domain/specification/max-distance-specification'
import { Distance } from '@/domain/value-object/distance'
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

export type CheckInUseCaseOutput = Either<
  Error | InvalidDistanceError,
  CheckInUseCaseResponse
>

@injectable()
export class CheckInUseCase {
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
    const distanceOrError = this.distanceBetweenCoords(
      {
        latitude: input.userLatitude,
        longitude: input.userLongitude,
      },
      {
        latitude: gymOrNull.latitude,
        longitude: gymOrNull.longitude,
      },
    )
    if (distanceOrError.isFailure()) {
      return failure(distanceOrError.value)
    }
    if (this.isDistanceExceeded(distanceOrError.value)) {
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
  ): Either<InvalidDistanceError, Distance> {
    // return DistanceCalculator.distanceBetweenCoordinates(userCoord, gymCoord)
    return Distance.create(userCoord, gymCoord)
  }

  private isDistanceExceeded(distance: Distance): boolean {
    const maxDistanceSpecification = new MaxDistanceSpecification()
    return maxDistanceSpecification.isSatisfiedBy(distance)
  }
}
