import { inject, injectable } from "inversify"
import type { Gym } from "@/gym/domain/gym"
import type { GymStatusTypes } from "@/gym/domain/value-object/gym-status"
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
	includeInactive?: boolean
}

export interface FetchGymByIdUseCaseOutputDTO {
	id: string
	cnpj: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	latitude: number
	longitude: number
	status: GymStatusTypes
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
		const gym = await this.gymRepository.gymOfId(input.gymId, {
			includeInactive: input.includeInactive ?? false,
		})
		if (!gym) return failure(new GymNotFoundError())
		return success(this.toDTO(gym))
	}

	private toDTO(gym: Gym): FetchGymByIdUseCaseOutputDTO {
		return {
			id: gym.id,
			cnpj: gym.cnpj,
			title: gym.title,
			description: gym.description ?? null,
			phone: gym.phone ?? null,
			address: gym.address ?? null,
			imageKey: gym.imageKey ?? null,
			latitude: gym.latitude,
			longitude: gym.longitude,
			status: gym.status,
		}
	}
}
