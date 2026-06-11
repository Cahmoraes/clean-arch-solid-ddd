import { inject, injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"

import { CheckInNotFoundError } from "../error/check-in-not-found-error"
import type { CheckInRepository } from "../repository/check-in-repository"

export interface RejectCheckInUseCaseInput {
	checkInId: string
}

export interface RejectCheckInUseCaseOutput {
	rejectedAt: Date
}

export type RejectCheckInUseCaseResponse = Either<
	CheckInNotFoundError,
	RejectCheckInUseCaseOutput
>

@injectable()
export class RejectCheckInUseCase {
	constructor(
		@inject(CHECKIN_TYPES.Repositories.CheckIn)
		private readonly checkInRepository: CheckInRepository,
	) {}

	public async execute(
		input: RejectCheckInUseCaseInput,
	): Promise<RejectCheckInUseCaseResponse> {
		const checkIn = await this.checkInRepository.checkOfById(input.checkInId)
		if (!checkIn) return failure(new CheckInNotFoundError())
		checkIn.reject()
		await this.checkInRepository.save(checkIn)
		return success({ rejectedAt: checkIn.rejectedAt ?? new Date() })
	}
}
