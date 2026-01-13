import { inject, injectable } from "inversify"

import type { Gym } from "@/gym/domain/gym"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import type { GymRepository } from "../repository/gym-repository"

export interface SearchGymUseCaseInput {
	name: string
	page?: number
}

interface SearchGymCoordinateDTO {
	latitude: number
	longitude: number
}

export interface SearchGymUseCaseOutput {
	id: string
	title: string
	description?: string
	phone: string
	coordinate: SearchGymCoordinateDTO
}

@injectable()
export class SearchGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: SearchGymUseCaseInput,
	): Promise<SearchGymUseCaseOutput[]> {
		const gyms = await this.gymRepository.gymOfTitle(
			input.name,
			this.pageNumberOrDefault(input.page),
		)
		return this.createGymDTO(gyms)
	}

	private pageNumberOrDefault(page?: number): number {
		return page ?? 1
	}

	private createGymDTO(gym: Gym[]): SearchGymUseCaseOutput[] {
		return gym.map((g) => ({
			id: g.id!,
			title: g.title,
			description: g.description,
			phone: g.phone ?? "",
			coordinate: {
				latitude: g.latitude,
				longitude: g.longitude,
			},
		}))
	}
}
