import type { Either } from "@/shared/domain/value-object/either.js"
import type { RoleTypes } from "@/user/domain/value-object/role.js"

export interface RoutePolicy {
	isProtected?: boolean
	onlyAdmin?: boolean
}

export interface GuardRequest {
	authorizationHeader?: string
}

export interface AuthenticatedUser {
	sub: {
		id: string
		email: string
		role: RoleTypes
		jwi: string
	}
	iat: number
	exp: number
}

export interface AccessDenied {
	status: number
	message: string
}

export interface RouteGuard {
	guard(
		request: GuardRequest,
		policy: RoutePolicy,
	): Promise<Either<AccessDenied, AuthenticatedUser | null>>
}
