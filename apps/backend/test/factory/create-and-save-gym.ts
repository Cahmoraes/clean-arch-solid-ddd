import { Gym } from "@/gym/domain/gym"
import type {
	DayScheduleDTO,
	OperatingHours,
} from "@/gym/domain/value-object/spec-gym-dates.js"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"

export interface CreateAndSaveGym {
	gymRepository: InMemoryGymRepository
	id?: string
	latitude?: number
	longitude?: number
	title?: string
	description?: string
	phone?: string
	address?: string
	operatingHours?: DayScheduleDTO[] | OperatingHours | null
}

export async function createAndSaveGym(props: CreateAndSaveGym) {
	const { gymRepository, id, operatingHours, ...restClean } = props
	const gymId = id ?? "any_gym_id"
	const gym = Gym.create({
		id: gymId,
		title: "any_name",
		latitude: props.latitude ?? 0,
		longitude: props.longitude ?? 0,
		cnpj: "11.222.333/0001-81",
		address: props.address ?? "Rua Padrão, 1, São Paulo - SP",
		...(operatingHours !== undefined ? { operatingHours } : {}),
		...restClean,
	}).forceSuccess().value
	await gymRepository.save(gym)
	return gymRepository.gyms.toArray()[0]
}
