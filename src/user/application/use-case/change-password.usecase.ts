import { inject, injectable } from "inversify"
import type { ValidationError } from "zod-validation-error"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { Queue } from "@/shared/infra/queue/queue"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import type { User } from "@/user/domain/user"

import { PasswordUnchangedError } from "../error/password-unchanged-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../repository/user-repository"

export interface ChangePasswordUseCaseInput {
	userId: string
	newRawPassword: string
}

export type ChangePasswordUseCaseOutput = Either<
	UserNotFoundError | ValidationError | PasswordUnchangedError,
	null
>

@injectable()
export class ChangePasswordUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
	) {
		this.bindMethod()
	}

	private bindMethod(): void {
		this.handlePasswordChangedEvent = this.handlePasswordChangedEvent.bind(this)
	}

	public async execute(
		input: ChangePasswordUseCaseInput,
	): Promise<ChangePasswordUseCaseOutput> {
		const userFound = await this.userRepository.userOfId(input.userId)
		if (!userFound) return failure(new UserNotFoundError())
		if (this.isPasswordUnchanged(userFound, input.newRawPassword)) {
			return failure(new PasswordUnchangedError())
		}
		userFound.subscribe(this.handlePasswordChangedEvent)
		const result = userFound.changePassword(input.newRawPassword)
		if (result.isFailure()) return failure(result.value)
		return success(null)
	}

	private isPasswordUnchanged(user: User, newRawPassword: string): boolean {
		return user.checkPassword(newRawPassword)
	}

	private handlePasswordChangedEvent(data: PasswordChangedEvent): void {
		const event = new PasswordChangedEvent({
			name: data.payload.name,
			email: data.payload.email,
		})
		this.queue.publish(event.name, event)
	}
}
