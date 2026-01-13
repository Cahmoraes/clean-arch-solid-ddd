import { inject, injectable } from "inversify"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { env } from "@/shared/infra/env"
import { AUTH_TYPES } from "@/shared/infra/ioc/types"

import type {
	RevokedTokenDAO,
	RevokedTokenData,
} from "../dao/revoked-token-dao"
import { TokenAlreadyRevokedError } from "../error/token-already-revoked-error"

export interface LogoutUseCaseInput {
	jwi: string
	userId: string
}

export type LogoutUseCaseOutput = Either<
	TokenAlreadyRevokedError,
	RevokedTokenData
>

@injectable()
export class LogoutUseCase {
	constructor(
		@inject(AUTH_TYPES.DAO.RevokedToken)
		private readonly revokedTokenDAO: RevokedTokenDAO,
	) {}

	public async execute(
		input: LogoutUseCaseInput,
	): Promise<LogoutUseCaseOutput> {
		const isTokenRevoked = await this.revokedTokenDAO.revokedTokenById(
			input.jwi,
		)
		if (isTokenRevoked) return failure(new TokenAlreadyRevokedError())
		const revokedTokenData = this.createRevokedTokenRecord(input)
		await this.revokedTokenDAO.revoke(revokedTokenData)
		return success(revokedTokenData)
	}

	private createRevokedTokenRecord({
		jwi,
		userId,
	}: LogoutUseCaseInput): RevokedTokenData {
		return {
			jwi,
			userId,
			revokedAt: new Date().toISOString(),
			expiresIn: env.JWT_REFRESH_EXPIRES_IN,
		}
	}
}
