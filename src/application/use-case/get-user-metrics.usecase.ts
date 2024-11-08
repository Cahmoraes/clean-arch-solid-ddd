import { inject, injectable } from 'inversify'

import { TYPES } from '@/shared/ioc/types'

import type { CheckInRepository } from '../repository/check-in-repository'

export interface GetMetricsUseCaseInput {
  userId: string
}

export interface GetMetricsUseCaseOutput {
  checkInsCount: number
}

@injectable()
export class GetMetricsUseCase {
  constructor(
    @inject(TYPES.Repositories.CheckIn)
    private readonly checkInRepository: CheckInRepository,
  ) {}

  public async execute(
    input: GetMetricsUseCaseInput,
  ): Promise<GetMetricsUseCaseOutput> {
    const checkInsCount = await this.checkInRepository.countByUserId(
      input.userId,
    )
    return {
      checkInsCount,
    }
  }
}
