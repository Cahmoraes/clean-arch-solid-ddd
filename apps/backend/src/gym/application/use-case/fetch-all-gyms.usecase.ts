import { inject, injectable } from "inversify"

import type { Gym } from "@/gym/domain/gym"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import type { GymRepository } from "../repository/gym-repository"

export interface FetchAllGymsUseCaseInput {
	page?: number
}

export interface FetchAllGymsUseCaseOutput {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	latitude: number
	longitude: number
}

@injectable()
export class FetchAllGymsUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: FetchAllGymsUseCaseInput,
	): Promise<FetchAllGymsUseCaseOutput[]> {
		const gyms = await this.gymRepository.fetchGyms({
			page: input.page ?? 1,
		})
		return this.toDTO(gyms)
	}

	private toDTO(gyms: Gym[]): FetchAllGymsUseCaseOutput[] {
		return gyms.map((g) => ({
			id: g.id,
			title: g.title,
			description: g.description ?? null,
			phone: g.phone ?? null,
			address: g.address ?? null,
			latitude: g.latitude,
			longitude: g.longitude,
		}))
	}
}
