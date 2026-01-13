import { inject, injectable } from "inversify"

import type { CheckInRepository } from "@/check-in/application/repository/check-in-repository"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { UnitOfWork } from "@/shared/infra/database/repository/unit-of-work/unit-of-work"
import {
	CHECKIN_TYPES,
	SHARED_TYPES,
	USER_TYPES,
} from "@/shared/infra/ioc/types"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface DeleteUserUseCaseInput {
	userId: string
}

export type DeleteUserUseCaseOutput = Either<UserNotFoundError | Error, null>

@injectable()
export class DeleteUserUseCase {
	private static PAGE_NUMBER = 1
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(CHECKIN_TYPES.Repositories.CheckIn)
		private readonly checkInRepository: CheckInRepository,
		@inject(SHARED_TYPES.UnitOfWork)
		private readonly unitOfWork: UnitOfWork,
	) {}

	public async execute(
		input: DeleteUserUseCaseInput,
	): Promise<DeleteUserUseCaseOutput> {
		const foundUser = await this.userRepository.userOfId(input.userId)
		if (!foundUser) return failure(new UserNotFoundError())
		const foundCheckIns = await this.checkInRepository.checkInsOfUserId(
			input.userId,
			DeleteUserUseCase.PAGE_NUMBER,
		)
		if (foundCheckIns.length) return failure(new Error("CheckIns found"))
		console.log(foundCheckIns)
		await this.unitOfWork.performTransaction(async (tx) => {
			await this.userRepository.withTransaction(tx).delete(foundUser)
		})
		return success(null)
	}
}
