import { inject, injectable } from 'inversify'

import { CheckIn } from '@/domain/check-in/check-in'
import type { InvalidDistanceError } from '@/domain/check-in/error/invalid-distance-error'
import type { CheckInCreatedEvent } from '@/domain/check-in/event/check-in-created-event'
import { MaxDistanceSpecification } from '@/domain/check-in/specification/max-distance-specification'
import { Distance } from '@/domain/check-in/value-object/distance'
import type { Gym } from '@/domain/gym/gym'
import { DomainEventPublisher } from '@/domain/shared/event/domain-event-publisher'
import {
  type Either,
  failure,
  success,
} from '@/domain/shared/value-object/either'
import type { PrismaUnitOfWork } from '@/infra/database/repository/unit-of-work/unit-of-work'
import { TYPES } from '@/infra/ioc/types'
import type { Logger } from '@/infra/logger/logger'
import type { Queue } from '@/infra/queue/queue'

import type { GymRepository } from '../../gym/repository/gym-repository'
import { UserHasAlreadyCheckedInToday } from '../../user/error/user-has-already-checked-in-today'
import { UserNotFoundError } from '../../user/error/user-not-found-error'
import { GymNotFoundError } from '../../user/error/user-not-found-error copy'
import type { UserRepository } from '../../user/repository/user-repository'
import { MaxDistanceError } from '../error/max-distance-error'
import type { CheckInRepository } from '../repository/check-in-repository'

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
    @inject(TYPES.Queue)
    private readonly queue: Queue,
    @inject(TYPES.Prisma.UnitOfWork)
    private readonly unityOfWork: PrismaUnitOfWork,
    @inject(TYPES.Logger)
    private readonly logger: Logger,
  ) {
    this.bindMethod()
  }

  private bindMethod(): void {
    this.createDomainEventSubscriber =
      this.createDomainEventSubscriber.bind(this)
  }

  public async execute(
    input: CheckInUseCaseInput,
  ): Promise<CheckInUseCaseOutput> {
    const checkInUserIsEligible = await this.validateUserCheckInEligibility(
      input.userId,
    )
    if (checkInUserIsEligible.isFailure()) {
      return failure(checkInUserIsEligible.value)
    }
    const gymFound = await this.gymRepository.gymOfId(input.gymId)
    if (!gymFound) return failure(new GymNotFoundError())
    const validateDistanceResult = await this.validateDistanceEligibility(
      input,
      gymFound,
    )
    if (validateDistanceResult.isFailure()) {
      return failure(validateDistanceResult.value)
    }
    const checkIn = CheckIn.create(input)
    const checkInId = await this.unityOfWork.performTransaction(async (tx) => {
      const { id } = await this.checkInRepository
        .withTransaction(tx)
        .save(checkIn)
      // throw new Error('Erro Transaction')
      void DomainEventPublisher.instance.subscribe(
        'checkInCreated',
        this.createDomainEventSubscriber,
      )
      return id
    })
    return success({
      checkInId,
      date: checkIn.createdAt,
    })
  }

  private async validateUserCheckInEligibility(
    userId: string,
  ): Promise<Either<UserNotFoundError | UserHasAlreadyCheckedInToday, null>> {
    const userFound = await this.userRepository.userOfId(userId)
    if (!userFound) return failure(new UserNotFoundError())
    const checkInOnSameDate = await this.hasCheckInOnSameDate(userId)
    if (checkInOnSameDate) return failure(new UserHasAlreadyCheckedInToday())
    return success(null)
  }

  private async validateDistanceEligibility(
    input: CheckInUseCaseInput,
    gym: Gym,
  ): Promise<Either<InvalidDistanceError | MaxDistanceError, Distance>> {
    const distanceResult = this.distanceBetweenCoords(
      {
        latitude: input.userLatitude,
        longitude: input.userLongitude,
      },
      {
        latitude: gym.latitude,
        longitude: gym.longitude,
      },
    )
    if (distanceResult.isFailure()) return failure(distanceResult.value)
    if (this.isDistanceExceeded(distanceResult.value)) {
      return failure(new MaxDistanceError())
    }
    return success(distanceResult.value)
  }

  private async createDomainEventSubscriber(
    event: CheckInCreatedEvent,
  ): Promise<void> {
    this.logger.info(this, event)
    this.queue.publish(event.eventName, event)
  }

  private async hasCheckInOnSameDate(userId: string): Promise<boolean> {
    const today = new Date()
    const checkInOnSameDate = await this.checkInRepository.onSameDateOfUserId(
      userId,
      today,
    )
    return checkInOnSameDate
  }

  private distanceBetweenCoords(
    userCoord: Coordinate,
    gymCoord: Coordinate,
  ): Either<InvalidDistanceError, Distance> {
    return Distance.create(userCoord, gymCoord)
  }

  private isDistanceExceeded(distance: Distance): boolean {
    const maxDistanceSpecification = new MaxDistanceSpecification()
    return maxDistanceSpecification.isSatisfiedBy(distance)
  }
}
