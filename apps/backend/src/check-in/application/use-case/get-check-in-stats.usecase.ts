import { inject, injectable } from "inversify"
import type { CheckInStats } from "@/check-in/application/repository/check-in-repository"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"
import type { CheckInRepository } from "../repository/check-in-repository"

export interface GetCheckInStatsUseCaseInput {
	userId?: string
}

export type GetCheckInStatsUseCaseOutput = CheckInStats

@injectable()
export class GetCheckInStatsUseCase {
	constructor(
		@inject(CHECKIN_TYPES.Repositories.CheckIn)
		private readonly checkInRepository: CheckInRepository,
	) {}

	public async execute(
		input: GetCheckInStatsUseCaseInput = {},
	): Promise<GetCheckInStatsUseCaseOutput> {
		return this.checkInRepository.countByStatus(input.userId)
	}
}
