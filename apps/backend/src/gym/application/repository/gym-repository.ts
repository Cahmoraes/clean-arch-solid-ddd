import type { Gym } from "@/gym/domain/gym"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"

export interface SaveGymResult {
	id: string
}

export interface FetchGymsInput {
	title?: string
	page: number
}

export interface FetchGymsOutput {
	items: Gym[]
	total: number
}

export interface GymRepository {
	save(gym: Gym): Promise<SaveGymResult>
	update(gym: Gym): Promise<void>
	gymOfId(id: string): Promise<Gym | null>
	fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
	gymOfCNPJ(cnpj: string): Promise<Gym | null>
	fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput>
	withTransaction<TX extends object>(object: TX): GymRepository
}
