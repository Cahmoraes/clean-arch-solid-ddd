import { inject, injectable } from "inversify"
import type { Gym } from "@/gym/domain/gym"
import type { GymStatusTypes } from "@/gym/domain/value-object/gym-status"
import { env } from "@/shared/infra/env"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { GymRepository } from "../repository/gym-repository"
import type { GymPaginationMeta } from "./gym-pagination-meta"

export interface FetchAllGymsUseCaseInput {
	page?: number
	includeInactive?: boolean
}

export interface FetchAllGymsUseCaseOutputDTO {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	latitude: number
	longitude: number
	status: GymStatusTypes
}

export interface FetchAllGymsUseCaseOutput {
	data: FetchAllGymsUseCaseOutputDTO[]
	pagination: GymPaginationMeta
}

@injectable()
export class FetchAllGymsUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: FetchAllGymsUseCaseInput,
	): Promise<FetchAllGymsUseCaseOutput> {
		const page = input.page ?? 1
		const { items, total } = await this.gymRepository.fetchGyms({
			page,
			includeInactive: input.includeInactive ?? false,
		})

		const data = this.toDTO(items)

		return {
			data,
			pagination: {
				total,
				page,
				limit: env.ITEMS_PER_PAGE,
			},
		}
	}

	private toDTO(gyms: Gym[]): FetchAllGymsUseCaseOutputDTO[] {
		return gyms.map((g) => ({
			id: g.id,
			title: g.title,
			description: g.description ?? null,
			phone: g.phone ?? null,
			address: g.address ?? null,
			imageKey: g.imageKey ?? null,
			latitude: g.latitude,
			longitude: g.longitude,
			status: g.status,
		}))
	}
}
