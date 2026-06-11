import { inject, injectable } from "inversify"
import type { ValidationError } from "zod-validation-error"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"
import type { User } from "@/user/domain/user"
import { InvalidCredentialsError } from "../error/invalid-credentials-error"
import { PasswordNotSetError } from "../error/password-not-set-error"
import { PasswordUnchangedError } from "../error/password-unchanged-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface ChangePasswordUseCaseInput {
	userId: string
	currentRawPassword: string
	newRawPassword: string
}

export type ChangePasswordUseCaseOutput = Either<
	| UserNotFoundError
	| InvalidCredentialsError
	| PasswordNotSetError
	| ValidationError
	| PasswordUnchangedError,
	null
>

@injectable()
export class ChangePasswordUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
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
		if (!userFound.password) {
			return failure(new PasswordNotSetError())
		}
		if (!(await userFound.checkPassword(input.currentRawPassword))) {
			return failure(new InvalidCredentialsError())
		}
		if (await this.isPasswordUnchanged(userFound, input.newRawPassword)) {
			return failure(new PasswordUnchangedError())
		}
		userFound.subscribe(this.handlePasswordChangedEvent)
		const result = await userFound.changePassword(input.newRawPassword)
		if (result.isFailure()) return failure(result.value)
		await this.userRepository.update(userFound)
		return success(null)
	}

	private async isPasswordUnchanged(
		user: User,
		newRawPassword: string,
	): Promise<boolean> {
		return user.checkPassword(newRawPassword)
	}

	private handlePasswordChangedEvent(data: PasswordChangedEvent): void {
		void DomainEventPublisher.instance.publish(data)
	}
}
