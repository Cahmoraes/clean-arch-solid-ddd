import { inject, injectable } from 'inversify'

import { TYPES } from '@/shared/ioc/types'

import type { CheckInRepository } from '../repository/check-in-repository'
import type { UserRepository } from '../repository/user-repository'

export interface CheckInHistoryUseCaseInput {
  userId: string
}

export interface CheckInsDTO {
  id: string
  checkInAt: Date
  location: {
    latitude: number
    longitude: number
  }
}

export interface CheckInHistoryUseCaseOutput {
  userId: string
  checkIns: CheckInsDTO[]
}

@injectable()
export class CheckInHistoryUseCase {
  constructor(
    @inject(TYPES.Repositories.User)
    private readonly userRepository: UserRepository,
    @inject(TYPES.Repositories.CheckIn)
    private readonly checkInRepository: CheckInRepository,
  ) {}

  public async execute(
    input: CheckInHistoryUseCaseInput,
  ): Promise<CheckInHistoryUseCaseOutput> {
    const userOrNull = await this.userRepository.findById(input.userId)
    if (!userOrNull) {
      return {
        userId: input.userId,
        checkIns: [],
      }
    }
    const checkIns = await this.checkInRepository.findByUserId(input.userId)
    const checkInsDTO: CheckInsDTO[] = checkIns.map((checkIn) => ({
      id: checkIn.id!,
      checkInAt: checkIn.createdAt,
      location: {
        latitude: checkIn.latitude,
        longitude: checkIn.longitude,
      },
    }))
    return {
      userId: input.userId,
      checkIns: checkInsDTO,
    }
  }
}
