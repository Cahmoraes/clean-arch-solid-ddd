import type { Coordinate } from "@/check-in/domain/value-object/coordinate"
import type { Gym } from "@/gym/domain/gym"

export interface SaveGymResult {
	id: string
}

export interface FetchGymsInput {
	title?: string
	page: number
}

export interface GymRepository {
	save(gym: Gym): Promise<SaveGymResult>
	gymOfId(id: string): Promise<Gym | null>
	fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
	gymOfCNPJ(cnpj: string): Promise<Gym | null>
	fetchGyms(input: FetchGymsInput): Promise<Gym[]>
	withTransaction<TX extends object>(object: TX): GymRepository
}
