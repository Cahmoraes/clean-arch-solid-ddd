import { inject, injectable } from "inversify"
import type {
	CheckInStatus,
	FindManyOutput,
} from "@/check-in/application/repository/check-in-repository"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"
import type { CheckInRepository } from "../repository/check-in-repository"

export interface FetchCheckInsUseCaseInput {
	page: number
	status?: CheckInStatus
}

export interface CheckInDTO {
	id: string
	userId: string
	gymId: string
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
	) {}

	public async execute(
		input: FetchCheckInsUseCaseInput,
	): Promise<FetchCheckInsUseCaseOutput> {
		const result: FindManyOutput = await this.checkInRepository.findMany({
			page: input.page,
			status: input.status,
		})
		return {
			items: this.toDTO(result.items),
			page: input.page,
			total: result.total,
		}
	}

	private toDTO(items: FindManyOutput["items"]): CheckInDTO[] {
		return items.map((checkIn) => ({
			id: checkIn.id,
			userId: checkIn.userId,
			gymId: checkIn.gymId,
			createdAt: checkIn.createdAt.toISOString(),
			validatedAt: checkIn.validatedAt?.toISOString() ?? null,
			rejectedAt: checkIn.rejectedAt?.toISOString() ?? null,
			status: checkIn.status,
			latitude: checkIn.latitude,
			longitude: checkIn.longitude,
		}))
	}
}
