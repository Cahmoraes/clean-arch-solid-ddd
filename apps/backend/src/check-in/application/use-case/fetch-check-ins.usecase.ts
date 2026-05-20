import { inject, injectable } from "inversify"
import type {
	CheckInStatus,
	FindManyOutput,
} from "@/check-in/application/repository/check-in-repository"
import type { GymRepository } from "@/gym/application/repository/gym-repository"
import { CHECKIN_TYPES, GYM_TYPES } from "@/shared/infra/ioc/types"
import type { CheckInRepository } from "../repository/check-in-repository"

export interface FetchCheckInsUseCaseInput {
	page: number
	status?: CheckInStatus
	userId?: string
}

export interface CheckInDTO {
	id: string
	userId: string
	gymId: string
	gymTitle: string | null
	createdAt: string
	validatedAt: string | null
	rejectedAt: string | null
	status: "pending" | "validated" | "rejected"
	latitude: number
	longitude: number
}

export interface FetchCheckInsUseCaseOutput {
	items: CheckInDTO[]
	page: number
	total: number
}

@injectable()
export class FetchCheckInsUseCase {
	constructor(
		@inject(CHECKIN_TYPES.Repositories.CheckIn)
		private readonly checkInRepository: CheckInRepository,
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: FetchCheckInsUseCaseInput,
	): Promise<FetchCheckInsUseCaseOutput> {
		const result: FindManyOutput = await this.checkInRepository.findMany({
			page: input.page,
			status: input.status,
			userId: input.userId,
		})
		const gymTitleMap = await this.buildGymTitleMap(result.items)
		return {
			items: this.toDTO(result.items, gymTitleMap),
			page: input.page,
			total: result.total,
		}
	}

	private async buildGymTitleMap(
		items: FindManyOutput["items"],
	): Promise<Map<string, string>> {
		const uniqueGymIds = [...new Set(items.map((c) => c.gymId))]
		const entries = await Promise.all(
			uniqueGymIds.map(async (id) => {
				const gym = await this.gymRepository.gymOfId(id)
				return gym ? ([id, gym.title] as const) : null
			}),
		)
		return new Map(entries.filter((e) => e !== null))
	}

	private toDTO(
		items: FindManyOutput["items"],
		gymTitleMap: Map<string, string>,
	): CheckInDTO[] {
		return items.map((checkIn) => ({
			id: checkIn.id,
			userId: checkIn.userId,
			gymId: checkIn.gymId,
			gymTitle: gymTitleMap.get(checkIn.gymId) ?? null,
			createdAt: checkIn.createdAt.toISOString(),
			validatedAt: checkIn.validatedAt?.toISOString() ?? null,
			rejectedAt: checkIn.rejectedAt?.toISOString() ?? null,
			status: checkIn.status,
			latitude: checkIn.latitude,
			longitude: checkIn.longitude,
		}))
	}
}
