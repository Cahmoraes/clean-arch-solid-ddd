import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
import type { UserValidationErrors } from "@/user/domain/user"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface UpdateMyProfileUseCaseInput {
	userId: string
	name: string
}

export interface UpdateMyProfileUseCaseOutputDTO {
	name: string
}

export type UpdateMyProfileUseCaseOutput = Either<
	UserNotFoundError | UserValidationErrors[],
	UpdateMyProfileUseCaseOutputDTO
>

@injectable()
export class UpdateMyProfileUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
	) {
		this.bindMethod()
	}

	private bindMethod(): void {
		this.handleUserProfileUpdatedEvent =
			this.handleUserProfileUpdatedEvent.bind(this)
	}

	public async execute(
		input: UpdateMyProfileUseCaseInput,
	): Promise<UpdateMyProfileUseCaseOutput> {
		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())

		user.subscribe(this.handleUserProfileUpdatedEvent)
		const updateResult = user.updateProfile({
			name: input.name,
			email: user.email,
		})
		if (updateResult.isFailure()) {
			return failure(updateResult.value)
		}

		await this.userRepository.update(user)
		return success({ name: user.name })
	}

	private handleUserProfileUpdatedEvent(data: UserProfileUpdatedEvent): void {
		void DomainEventPublisher.instance.publish(data)
	}
}
