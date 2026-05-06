import { inject, injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import { GymNotFoundError } from "../error/gym-not-found-error"
import type { GymRepository } from "../repository/gym-repository"

export interface FetchGymByIdUseCaseInput {
	gymId: string
}

export interface FetchGymByIdUseCaseOutputDTO {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	latitude: number
	longitude: number
}

export type FetchGymByIdUseCaseOutput = Either<
	Error,
	FetchGymByIdUseCaseOutputDTO
>

@injectable()
export class FetchGymByIdUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: FetchGymByIdUseCaseInput,
	): Promise<FetchGymByIdUseCaseOutput> {
		const gym = await this.gymRepository.gymOfId(input.gymId)
		if (!gym) return failure(new GymNotFoundError())
		return success({
			id: gym.id,
			title: gym.title,
			description: gym.description ?? null,
			phone: gym.phone ?? null,
			address: gym.address ?? null,
			latitude: gym.latitude,
			longitude: gym.longitude,
		})
	}
}
