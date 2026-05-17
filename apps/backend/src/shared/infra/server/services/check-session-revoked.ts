import type { FastifyReply, FastifyRequest } from "fastify"
import type { RevokedTokenDAO } from "@/session/application/dao/revoked-token-dao"
import { container } from "../../ioc/container"
import { AUTH_TYPES } from "../../ioc/types"
import { HTTP_STATUS } from "../http-status"

export interface CheckSessionRevokedHandlerConstructor {
	request: FastifyRequest
	reply: FastifyReply
}

export interface CheckSessionRevokedHandlerExecute {
	jwi: string
	userId: string
}

export class CheckSessionRevokedHandler {
	private readonly request: FastifyRequest
	private readonly reply: FastifyReply
	private readonly sessionDAO: RevokedTokenDAO

	constructor(props: CheckSessionRevokedHandlerConstructor) {
		this.request = props.request
		this.reply = props.reply
		this.sessionDAO = container.get<RevokedTokenDAO>(
			AUTH_TYPES.DAO.RevokedToken,
		)
	}

	public async execute(
		input: CheckSessionRevokedHandlerExecute,
	): Promise<void> {
		const sessionFound = await this.sessionDAO.revokedTokenById(input.jwi)
		if (sessionFound) {
			this.reply.status(HTTP_STATUS.UNAUTHORIZED).send({
				message: "Session already revoked",
			})
			return
		}
		const userRevoked = await this.sessionDAO.isAllRevokedForUser(input.userId)
		if (userRevoked) {
			this.reply.status(HTTP_STATUS.UNAUTHORIZED).send({
				message: "Session already revoked",
			})
			return
		}
	}
}
