import { inject, injectable } from 'inversify'

import { type Either, failure, success } from '@/domain/value-object/either'
import { TYPES } from '@/infra/ioc/types'

import type { CheckInTimeExceededError } from '../../domain/error/check-in-time-exceeded-error'
import { CheckInNotFoundError } from '../error/check-in-not-found-error'
import type { CheckInRepository } from '../repository/check-in-repository'

export interface ValidateCheckInUseCaseInput {
  checkInId: string
}

export interface ValidateCheckInUseCaseOutput {
  validatedAt: Date
}

export type ValidateCheckInUseCaseResponse = Either<
  CheckInNotFoundError | CheckInTimeExceededError,
  ValidateCheckInUseCaseOutput
>

@injectable()
export class ValidateCheckInUseCase {
  constructor(
    @inject(TYPES.Repositories.CheckIn)
    private readonly checkInRepository: CheckInRepository,
  ) {}

  public async execute(
    input: ValidateCheckInUseCaseInput,
  ): Promise<ValidateCheckInUseCaseResponse> {
    const checkInOrNull = await this.checkInRepository.findById(input.checkInId)
    if (!checkInOrNull) return failure(new CheckInNotFoundError())
    const validatedOrError = checkInOrNull.validate()
    if (validatedOrError.isFailure()) return failure(validatedOrError.value)
    await this.checkInRepository.save(checkInOrNull)
    return success({
      validatedAt: new Date(),
    })
  }
}
