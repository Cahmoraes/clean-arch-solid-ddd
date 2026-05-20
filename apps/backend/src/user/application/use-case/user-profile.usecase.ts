import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { User } from "@/user/domain/user"
import type { StatusTypes } from "@/user/domain/value-object/status"
import { UserNotFoundError } from "../error/user-not-found-error"
import type { UserRepository } from "../persistence/repository/user-repository"

export interface UserProfileUseCaseInput {
	userId: string
}

interface UserProfileUseCaseOutputDTO {
	id: string | null
	name: string
	email: string
	role: string
	hasPassword: boolean
	authMethods: string[]
	createdAt: string
	status: StatusTypes
}

export type UserProfileUseCaseOutput = Either<
	Error,
	UserProfileUseCaseOutputDTO
>

@injectable()
export class UserProfileUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
	) {}

	private resolveAuthMethods(user: User): string[] {
		const methods: string[] = []
		if (user.password) methods.push("password")
		if (user.googleId) methods.push("google")
		return methods
	}

	public async execute(
		input: UserProfileUseCaseInput,
	): Promise<UserProfileUseCaseOutput> {
		const userOrNull = await this.userRepository.userOfId(input.userId)
		if (!userOrNull) return failure(new UserNotFoundError())
		return success({
			email: userOrNull.email,
			id: userOrNull.id,
			name: userOrNull.name,
			role: userOrNull.role,
			hasPassword: Boolean(userOrNull.password),
			authMethods: this.resolveAuthMethods(userOrNull),
			createdAt: userOrNull.createdAt.toISOString(),
			status: userOrNull.status,
		})
	}
}
