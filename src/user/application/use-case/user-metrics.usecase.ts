import { inject, injectable } from 'inversify'

import type { CheckInRepository } from '@/check-in/application/repository/check-in-repository'
import { SHARED_TYPES, USER_TYPES, GYM_TYPES, CHECKIN_TYPES, AUTH_TYPES, HEALTH_CHECK_TYPES } from '@/shared/infra/ioc/types'

export interface UserMetricsUseCaseInput {
  userId: string
}

export interface UserMetricsUseCaseOutput {
  checkInsCount: number
}

@injectable()
export class UserMetricsUseCase {
  constructor(
    @inject(CHECKIN_TYPES.Repositories.CheckIn)
    private readonly checkInRepository: CheckInRepository,
  ) {}

  public async execute(
    input: UserMetricsUseCaseInput,
  ): Promise<UserMetricsUseCaseOutput> {
    const checkInsCount = await this.checkInRepository.countOfUserId(
      input.userId,
    )
    return {
      checkInsCount,
    }
  }
}
