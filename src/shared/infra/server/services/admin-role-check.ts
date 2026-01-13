import type { FastifyReply, FastifyRequest } from "fastify"

import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import { type RoleTypes, RoleValues } from "@/user/domain/value-object/role"

import { HTTP_STATUS } from "../http-status"

export interface AdminRoleCheckConstructor {
	request: FastifyRequest
	reply: FastifyReply
}

export class AdminRoleCheck {
	private readonly request: FastifyRequest
	private readonly reply: FastifyReply
	private readonly logger: Logger

	constructor(props: AdminRoleCheckConstructor) {
		this.request = props.request
		this.reply = props.reply
		this.logger = container.get<Logger>(SHARED_TYPES.Logger)
	}

	public execute(role: RoleTypes): FastifyReply | void {
		if (role !== RoleValues.ADMIN) {
			this.logWhenRoleIsNotAdmin()
			return this.reply
				.status(HTTP_STATUS.FORBIDDEN)
				.send({ message: "Forbidden" })
		}
	}

	private logWhenRoleIsNotAdmin(): void {
		this.logger.warn(this, {
			message: "User is not an admin",
			route: this.request.url,
			role: this.request.user.sub.role,
		})
	}
}
