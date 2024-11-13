import { inject, injectable } from 'inversify'

import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/infra/ioc/types'

import { CheckInNotFoundError } from '../error/check-in-not-found-error'
import type { CheckInTimeExceededError } from '../error/check-in-time-exceeded-error'
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
    if (!checkInOrNull) return left(new CheckInNotFoundError())
    const validatedOrError = checkInOrNull.validate()
    if (validatedOrError.isLeft()) return left(validatedOrError.value)
    await this.checkInRepository.save(checkInOrNull)
    return right({
      validatedAt: new Date(),
    })
  }
}