import { inject, injectable } from "inversify"

import type { Gym } from "@/gym/domain/gym"
import type { GymStatusTypes } from "@/gym/domain/value-object/gym-status"
import { env } from "@/shared/infra/env"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import type { GymRepository } from "../repository/gym-repository"
import type { GymPaginationMeta } from "./gym-pagination-meta"

export interface SearchGymUseCaseInput {
	name: string
	page?: number
	includeInactive?: boolean
}

export interface SearchGymUseCaseOutputDTO {
	id: string
	title: string
	description: string | null
	phone: string | null
	imageKey: string | null
	latitude: number
	longitude: number
	status: GymStatusTypes
}

export interface SearchGymUseCaseOutput {
	data: SearchGymUseCaseOutputDTO[]
	pagination: GymPaginationMeta
}

@injectable()
export class SearchGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: SearchGymUseCaseInput,
	): Promise<SearchGymUseCaseOutput> {
		const page = this.pageNumberOrDefault(input.page)
		const { items, total } = await this.gymRepository.fetchGyms({
			title: input.name,
			page,
			includeInactive: input.includeInactive ?? false,
		})

		const data = this.createGymDTO(items)

		return {
			data,
			pagination: {
				total,
				page,
				limit: env.ITEMS_PER_PAGE,
			},
		}
	}

	private pageNumberOrDefault(page?: number): number {
		return page ?? 1
	}

	private createGymDTO(gym: Gym[]): SearchGymUseCaseOutputDTO[] {
		return gym.map((g) => ({
			id: g.id,
			title: g.title,
			description: g.description ?? null,
			phone: g.phone ?? null,
			imageKey: g.imageKey ?? null,
			latitude: g.latitude,
			longitude: g.longitude,
			status: g.status,
		}))
	}
}
