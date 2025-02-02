import { inject, injectable } from 'inversify'

import { TYPES } from '@/infra/ioc/types'

import type { CheckInRepository } from '../../check-in/repository/check-in-repository'

export interface UserMetricsUseCaseInput {
  userId: string
}

export interface UserMetricsUseCaseOutput {
  checkInsCount: number
}

@injectable()
export class UserMetricsUseCase {
  constructor(
    @inject(TYPES.Repositories.CheckIn)
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
