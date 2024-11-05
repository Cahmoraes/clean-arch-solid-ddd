import { inject, injectable } from 'inversify'

import { CheckIn } from '@/domain/check-in'
import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/shared/ioc/types'

import { UserNotFoundError } from '../error/user-not-found-error'
import { GymNotFoundError } from '../error/user-not-found-error copy'
import type { CheckInRepository } from '../repository/check-in-repository'
import type { GymRepository } from '../repository/gym-repository'
import type { UserRepository } from '../repository/user-repository'

export interface CheckInUseCaseInput {
  userId: string
  gymId: string
}
export interface CheckInUseCaseResponse {
  checkInId: string
  date: Date
}

export type CheckInUseCaseOutput = Either<Error, CheckInUseCaseResponse>

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
    const userOrNull = await this.userRepository.findById(input.userId)
    if (!userOrNull) return left(new UserNotFoundError())
    const gymOrNull = await this.gymRepository.findById(input.gymId)
    if (!gymOrNull) return left(new GymNotFoundError())
    const checkIn = CheckIn.create(input)
    const { id } = await this.checkInRepository.save(checkIn)
    return right({
      checkInId: id,
      date: checkIn.createdAt,
    })
  }
}
