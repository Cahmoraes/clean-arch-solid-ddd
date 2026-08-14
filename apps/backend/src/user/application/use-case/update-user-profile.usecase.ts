import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { UserProfileUpdatedEvent } from "@/user/domain/event/user-profile-updated-event"
import { UserManagementPolicy } from "@/user/domain/service/user-management-policy"
import type { User, UserValidationErrors } from "@/user/domain/user"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface UpdateUserProfileUseCaseInput {
	requesterId: string
	userId: string
	name: string
	email: string
}

export type UpdateUserProfileUseCaseOutput = Either<
	| UserValidationErrors[]
	| UserValidationErrors
	| UserNotFoundError
	| NotAllowedToManageUserError,
	User
>

@injectable()
export class UpdateUserProfileUseCase {
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
		input: UpdateUserProfileUseCaseInput,
	): Promise<UpdateUserProfileUseCaseOutput> {
		const requester = await this.userRepository.userOfId(input.requesterId)
		if (!requester) return failure(new NotAllowedToManageUserError())

		const user = await this.userRepository.userOfId(input.userId)
		if (!user) return failure(new UserNotFoundError())

		if (!UserManagementPolicy.canEditProfile(requester, user)) {
			return failure(new NotAllowedToManageUserError())
		}

		user.subscribe(this.handleUserProfileUpdatedEvent)
		const profileUpdateResult = user.updateProfile({
			name: input.name,
			email: input.email,
		})
		if (profileUpdateResult.isFailure()) {
			return failure(profileUpdateResult.value)
		}
		await this.userRepository.update(user)
		return success(user)
	}

	private handleUserProfileUpdatedEvent(data: UserProfileUpdatedEvent): void {
		void DomainEventPublisher.instance.publish(data)
	}
}
