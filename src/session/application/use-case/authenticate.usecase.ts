/** biome-ignore-all lint/style/noNonNullAssertion: for testing */
import { randomBytes } from "node:crypto"

import { inject, injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { env } from "@/shared/infra/env"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { InvalidCredentialsError } from "@/user/application/error/invalid-credentials-error"
import type { UserRepository } from "@/user/application/repository/user-repository"
import type { User } from "@/user/domain/user"

export interface AuthenticateUseCaseInput {
	email: string
	password: string
}

export interface AuthTokenOutputDTO {
	token: string
	refreshToken: string
}

export type AuthenticateUseCaseOutput = Either<
	InvalidCredentialsError,
	AuthTokenOutputDTO
>

@injectable()
export class AuthenticateUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
	) {}

	public async execute(
		input: AuthenticateUseCaseInput,
	): Promise<AuthenticateUseCaseOutput> {
		const userOrNull = await this.userRepository.userOfEmail(input.email)
		if (!userOrNull) {
			return failure(new InvalidCredentialsError())
		}
		if (!(await userOrNull.checkPassword(input.password))) {
			return failure(new InvalidCredentialsError())
		}
		const jwi = this.createJSONWebId()
		return success({
			token: this.signUserToken(userOrNull, jwi),
			refreshToken: this.createRefreshToken(userOrNull, jwi),
		})
	}

	private createJSONWebId(): string {
		return randomBytes(16).toString("hex")
	}

	private signUserToken(user: User, jwi: string): string {
		return this.authToken.sign(
			{
				sub: {
					id: user.id!,
					email: user.email,
					role: user.role,
					jwi,
				},
			},
			env.PRIVATE_KEY,
		)
	}

	private createRefreshToken(user: User, jwi: string): string {
		return this.authToken.refreshToken(
			{
				sub: {
					// biome-ignore lint/style/noNonNullAssertion: intentionally
					id: user.id!,
					email: user.email,
					role: user.role,
					jwi,
				},
			},
			env.PRIVATE_KEY,
		)
	}
}
