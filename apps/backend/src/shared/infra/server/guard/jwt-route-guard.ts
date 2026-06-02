import { inject, injectable } from "inversify"
import type { RevokedTokenDAO } from "@/session/application/dao/revoked-token-dao.js"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { env } from "@/shared/infra/env/index.js"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { Logger } from "@/shared/infra/logger/logger.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import type { AuthToken } from "@/user/application/auth/auth-token.js"
import { RoleValues } from "@/user/domain/value-object/role.js"
import type {
	AccessDenied,
	AuthenticatedUser,
	GuardRequest,
	RouteGuard,
	RoutePolicy,
} from "./route-guard.js"

@injectable()
export class JwtRouteGuard implements RouteGuard {
	constructor(
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
		@inject(AUTH_TYPES.DAO.RevokedToken)
		private readonly revokedTokenDAO: RevokedTokenDAO,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {}

	public async guard(
		request: GuardRequest,
		policy: RoutePolicy,
	): Promise<Either<AccessDenied, AuthenticatedUser | null>> {
		if (!policy.isProtected) return success(null)
		const userOrDenied = this.authenticate(request)
		if (userOrDenied.isFailure()) return failure(userOrDenied.value)
		const user = userOrDenied.forceSuccess().value
		const adminDenied = this.checkAdminRole(user, policy)
		if (adminDenied) return failure(adminDenied)
		const revokedDenied = await this.checkSessionRevoked(user)
		if (revokedDenied) return failure(revokedDenied)
		return success(user)
	}

	private authenticate(
		request: GuardRequest,
	): Either<AccessDenied, AuthenticatedUser> {
		if (!request.authorizationHeader) {
			this.logger.warn(this, "No token provided")
			return failure(JwtRouteGuard.unauthorized())
		}
		const [, token] = request.authorizationHeader.split("Bearer ")
		const verifiedOrError = this.authToken.verify<AuthenticatedUser>(
			token,
			env.PRIVATE_KEY,
		)
		if (verifiedOrError.isFailure()) {
			this.logger.warn(this, {
				message: "Token verification failed",
				error: verifiedOrError.value,
			})
			return failure(JwtRouteGuard.unauthorized())
		}
		return success(verifiedOrError.forceSuccess().value)
	}

	private checkAdminRole(
		user: AuthenticatedUser,
		policy: RoutePolicy,
	): AccessDenied | undefined {
		if (!policy.onlyAdmin) return undefined
		if (user.sub.role === RoleValues.ADMIN) return undefined
		this.logger.warn(this, {
			message: "User is not an admin",
			role: user.sub.role,
		})
		return {
			status: HTTP_STATUS.FORBIDDEN,
			message: "Forbidden",
		}
	}

	private async checkSessionRevoked(
		user: AuthenticatedUser,
	): Promise<AccessDenied | undefined> {
		const sessionFound = await this.revokedTokenDAO.revokedTokenById(
			user.sub.jwi,
		)
		if (sessionFound) return JwtRouteGuard.sessionRevoked()
		const revokedAfter = await this.revokedTokenDAO.revokedAfterForUser(
			user.sub.id,
		)
		if (revokedAfter !== null && user.iat <= revokedAfter) {
			return JwtRouteGuard.sessionRevoked()
		}
		return undefined
	}

	private static unauthorized(): AccessDenied {
		return {
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Unauthorized",
		}
	}

	private static sessionRevoked(): AccessDenied {
		return {
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Session already revoked",
		}
	}
}
