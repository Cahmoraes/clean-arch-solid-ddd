import { inject, injectable } from 'inversify'

import { Gym } from '@/gym/domain/gym'
import {
  type Either,
  failure,
  success,
} from '@/shared/domain/value-object/either'
import { TYPES } from '@/shared/infra/ioc/types'
import type { InvalidNameLengthError } from '@/user/domain/error/invalid-name-length-error'

import { GymAlreadyExistsError } from '../error/gym-already-exists-error'
import { GymWithCNPJAlreadyExistsError } from '../error/gym-with-cnpj-already-exists-error'
import type { GymRepository } from '../repository/gym-repository'

export interface CreateGymUseCaseInput {
  cnpj: string
  title: string
  description?: string
  phone?: string
  latitude: number
  longitude: number
}

export interface CreateGymResponse {
  gymId: string
}

export type CreateGymUseCaseOutput = Either<
  InvalidNameLengthError | GymAlreadyExistsError,
  CreateGymResponse
>

@injectable()
export class CreateGymUseCase {
  constructor(
    @inject(TYPES.Repositories.Gym)
    private readonly gymRepository: GymRepository,
  ) {}

  public async execute(
    input: CreateGymUseCaseInput,
  ): Promise<CreateGymUseCaseOutput> {
    const foundGym = await this.gymRepository.gymOfCNPJ(input.cnpj)
    if (foundGym) {
      return failure(new GymWithCNPJAlreadyExistsError(input.cnpj))
    }
    const gymOrError = Gym.create(input)
    if (gymOrError.isFailure()) return failure(gymOrError.value)
    const { id } = await this.gymRepository.save(gymOrError.value)
    return success({ gymId: id })
  }
}
