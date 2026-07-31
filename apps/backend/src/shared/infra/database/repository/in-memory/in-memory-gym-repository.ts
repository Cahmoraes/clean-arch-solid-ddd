import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
	FetchGymsInput,
	FetchGymsOutput,
	GymRepository,
	SaveGymResult,
} from "@/gym/application/repository/gym-repository"
import { Gym } from "@/gym/domain/gym"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import { env } from "@/shared/infra/env"

@injectable()
export class InMemoryGymRepository implements GymRepository {
	public static KILOMETER = 1
	public gyms = new ExtendedSet<Gym>()

	public withTransaction(): GymRepository {
		return this
	}

	public async save(gym: Gym): Promise<SaveGymResult> {
		const gymWithId = Gym.restore({
			id: gym.id,
			title: gym.title,
			description: gym.description,
			latitude: gym.latitude,
			longitude: gym.longitude,
			phone: gym.phone,
			cnpj: gym.cnpj,
			address: gym.address,
			imageKey: gym.imageKey,
			status: gym.status,
		})
		this.gyms.add(gymWithId)
		return { id: gym.id }
	}

	public async update(gym: Gym): Promise<void> {
		const existing = this.gyms.find((current) => current.id === gym.id)
		if (existing) this.gyms.delete(existing)
		this.gyms.add(
			Gym.restore({
				id: gym.id,
				title: gym.title,
				description: gym.description,
				latitude: gym.latitude,
				longitude: gym.longitude,
				phone: gym.phone,
				cnpj: gym.cnpj,
				address: gym.address,
				imageKey: gym.imageKey,
				status: gym.status,
			}),
		)
	}

	public async gymOfId(
		id: string,
		options?: { includeInactive?: boolean },
	): Promise<Gym | null> {
		const gym = this.gyms.find((gym) => gym.id === id)
		if (!gym) return null
		if (options?.includeInactive === false && gym.status !== "activated")
			return null
		return gym
	}

	public async fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput> {
		const title = input.title?.toLocaleLowerCase()
		let filteredGyms = title
			? this.gyms.filter((gym) => gym.title.toLocaleLowerCase().includes(title))
			: this.gyms

		if (input.includeInactive === false) {
			filteredGyms = filteredGyms.filter((gym) => gym.status === "activated")
		}

		const all = filteredGyms.toArray()
		const items = all.slice(
			(input.page - 1) * env.ITEMS_PER_PAGE,
			input.page * env.ITEMS_PER_PAGE,
		)

		return { items, total: all.length }
	}

	public async fetchNearbyCoord(
		coordinate: Coordinate,
		options?: { includeInactive?: boolean },
	): Promise<Gym[]> {
		const nearbyGyms = this.gyms.filter((gym) => {
			const gymCoordinate = Coordinate.restore({
				latitude: gym.latitude,
				longitude: gym.longitude,
			})
			const distance = coordinate.distanceTo(gymCoordinate)
			if (distance > InMemoryGymRepository.KILOMETER) return false
			if (options?.includeInactive === false && gym.status !== "activated")
				return false
			return true
		})
		return nearbyGyms.toArray()
	}

	public async gymOfCNPJ(cnpj: string): Promise<Gym | null> {
		return this.gyms.find((gym) => gym.cnpj === cnpj)
	}
}
