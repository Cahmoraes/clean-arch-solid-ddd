import { inject, injectable } from "inversify"

import type { CheckIn } from "@/check-in/domain/check-in"
import { CHECKIN_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"

import type { CheckInRepository } from "../repository/check-in-repository"

export interface CheckInHistoryUseCaseInput {
	userId: string
	page?: number
}

export interface CheckInsDTO {
	id: string
	checkInAt: Date
	location: {
		latitude: number
		longitude: number
	}
}

export interface CheckInHistoryUseCaseOutput {
	userId: string
	checkIns: CheckInsDTO[]
}

@injectable()
export class CheckInHistoryUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(CHECKIN_TYPES.Repositories.CheckIn)
		private readonly checkInRepository: CheckInRepository,
	) {}

	public async execute(
		input: CheckInHistoryUseCaseInput,
	): Promise<CheckInHistoryUseCaseOutput> {
		const userOrNull = await this.userRepository.userOfId(input.userId)
		if (!userOrNull) {
			return {
				userId: input.userId,
				checkIns: [],
			}
		}
		const { items } = await this.checkInRepository.findMany({
			userId: input.userId,
			page: this.pageNumberOrDefault(input.page),
		})
		return {
			userId: input.userId,
			checkIns: this.createCheckInsDTO(items),
		}
	}

	private createCheckInsDTO(checkIns: CheckIn[]): CheckInsDTO[] {
		return checkIns.map((checkIn) => ({
			id: checkIn.id,
			checkInAt: checkIn.createdAt,
			location: {
				latitude: checkIn.latitude,
				longitude: checkIn.longitude,
			},
		}))
	}

	private pageNumberOrDefault(page?: number): number {
		return page ?? 1
	}
}
