import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
	FetchGymsInput,
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
		})
		this.gyms.add(gymWithId)
		return { id: gym.id }
	}

	public async gymOfId(id: string): Promise<Gym | null> {
		return this.gyms.find((gym) => gym.id === id)
	}

	public async fetchGyms(input: FetchGymsInput): Promise<Gym[]> {
		const title = input.title?.toLocaleLowerCase()
		const filteredGyms = title
			? this.gyms.filter((gym) => gym.title.toLocaleLowerCase().includes(title))
			: this.gyms

		return filteredGyms
			.toArray()
			.slice(
				(input.page - 1) * env.ITEMS_PER_PAGE,
				input.page * env.ITEMS_PER_PAGE,
			)
	}

	public async fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]> {
		const nearbyGyms = this.gyms.filter((gym) => {
			const gymCoordinate = Coordinate.restore({
				latitude: gym.latitude,
				longitude: gym.longitude,
			})
			const distance = coordinate.distanceTo(gymCoordinate)
			return distance <= InMemoryGymRepository.KILOMETER
		})
		return nearbyGyms.toArray()
	}

	public async gymOfCNPJ(cnpj: string): Promise<Gym | null> {
		return this.gyms.find((gym) => gym.cnpj === cnpj)
	}
}
