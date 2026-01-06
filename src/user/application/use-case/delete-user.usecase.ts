import { inject, injectable } from "inversify"

import type { CheckInRepository } from "@/check-in/application/repository/check-in-repository"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { CHECKIN_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"

import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface DeleteUserUseCaseInput {
	userId: string
}

export type DeleteUserUseCaseOutput = Either<UserNotFoundError | Error, null>

@injectable()
export class DeleteUserUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(CHECKIN_TYPES.Repositories.CheckIn)
		private readonly checkInRepository: CheckInRepository,
	) {}

	public async execute(
		input: DeleteUserUseCaseInput,
	): Promise<DeleteUserUseCaseOutput> {
		const foundUser = await this.userRepository.userOfId(input.userId)
		if (!foundUser) return failure(new UserNotFoundError())
		const foundCheckIns = await this.checkInRepository.checkInsOfUserId(
			input.userId,
			1,
		)
		if (foundCheckIns.length) return failure(new Error("CheckIns found"))
		console.log(foundCheckIns)
		await this.userRepository.delete(foundUser)
		return success(null)
	}
}
