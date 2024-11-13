import { inject, injectable } from 'inversify'

import { type Either, left, right } from '@/domain/value-object/either'
import { TYPES } from '@/infra/ioc/types'

import { CheckInNotFoundError } from '../error/check-in-not-found-error'
import type { CheckInRepository } from '../repository/check-in-repository'
import type { UserRepository } from '../repository/user-repository'

export interface ValidateCheckInUseCaseInput {
  checkInId: string
}

export interface ValidateCheckInUseCaseOutput {
  validatedAt: Date
}

export type ValidateCheckInUseCaseResponse = Either<
  Error,
  ValidateCheckInUseCaseOutput
>

@injectable()
export class ValidateCheckInUseCase {
  constructor(
    @inject(TYPES.Repositories.CheckIn)
    private readonly userRepository: UserRepository,
    @inject(TYPES.Repositories.CheckIn)
    private readonly checkInRepository: CheckInRepository,
  ) {}

  public async execute(
    input: ValidateCheckInUseCaseInput,
  ): Promise<ValidateCheckInUseCaseResponse> {
    const checkInOrNull = await this.checkInRepository.findById(input.checkInId)
    if (!checkInOrNull) return left(new CheckInNotFoundError())
    checkInOrNull.validate()
    await this.checkInRepository.save(checkInOrNull)
    return right({
      validatedAt: new Date(),
    })
  }
}
