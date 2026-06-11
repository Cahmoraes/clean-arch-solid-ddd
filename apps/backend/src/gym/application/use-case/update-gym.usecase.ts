import { inject, injectable } from "inversify"

import { Gym } from "@/gym/domain/gym"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { InvalidNameLengthError } from "@/user/domain/error/invalid-name-length-error"

import { GymNotFoundError } from "../error/gym-not-found-error"
import { GymWithCNPJAlreadyExistsError } from "../error/gym-with-cnpj-already-exists-error"
import type { GymRepository } from "../repository/gym-repository"

export interface UpdateGymUseCaseInput {
	gymId: string
	cnpj: string
	title: string
	description?: string
	phone?: string
	latitude: number
	longitude: number
	address: string
}

export interface UpdateGymResponse {
	gymId: string
}

export type UpdateGymUseCaseOutput = Either<
	InvalidNameLengthError | GymNotFoundError | GymWithCNPJAlreadyExistsError,
	UpdateGymResponse
>

@injectable()
export class UpdateGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: UpdateGymUseCaseInput,
	): Promise<UpdateGymUseCaseOutput> {
		const existingGym = await this.gymRepository.gymOfId(input.gymId)
		if (!existingGym) return failure(new GymNotFoundError())

		const gymWithSameCNPJ = await this.gymRepository.gymOfCNPJ(input.cnpj)
		if (gymWithSameCNPJ && gymWithSameCNPJ.id !== input.gymId) {
			return failure(new GymWithCNPJAlreadyExistsError(input.cnpj))
		}

		const gymOrError = Gym.create({
			id: input.gymId,
			cnpj: input.cnpj,
			title: input.title,
			description: input.description,
			phone: input.phone,
			latitude: input.latitude,
			longitude: input.longitude,
			address: input.address,
			imageKey: existingGym.imageKey,
		})
		if (gymOrError.isFailure()) return failure(gymOrError.value)

		await this.gymRepository.update(gymOrError.value)
		return success({ gymId: input.gymId })
	}
}
