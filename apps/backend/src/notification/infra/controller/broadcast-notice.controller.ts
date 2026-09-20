import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import {
	type BroadcastNoticeUseCase,
	NOTICE_MESSAGE_MAX,
	NOTICE_TITLE_MAX,
} from "@/notification/application/use-case/broadcast-notice.usecase.js"
import { InvalidNoticeError } from "@/notification/domain/errors/invalid-notice-error.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

const broadcastNoticeBodySchema = z.object({
	title: z.string().min(1).max(NOTICE_TITLE_MAX).meta({
		description: "Notice title (1 to 100 characters)",
		example: "Manutenção programada",
	}),
	message: z.string().min(1).max(NOTICE_MESSAGE_MAX).meta({
		description: "Notice message (1 to 500 characters)",
		example: "O sistema ficará fora do ar hoje às 22h.",
	}),
})

const broadcastNoticeResponseSchema = z.object({
	recipients: z.number().int().min(0).meta({
		description: "Number of active users that received the notice",
		example: 42,
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class BroadcastNoticeController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.UseCases.BroadcastNotice)
		private readonly broadcastNotice: BroadcastNoticeUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"post",
			NotificationRoutes.BROADCAST,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeBroadcastNoticeSwaggerSchema(),
		)
	}

	protected mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (error instanceof InvalidNoticeError) {
			return ResponseFactory.BAD_REQUEST({ message: error.message })
		}
		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parsedBody = this.parseRequest(broadcastNoticeBodySchema, req.body)
		if (parsedBody.isFailure()) {
			return this.createResponseError(parsedBody)
		}
		const result = await this.broadcastNotice.execute(parsedBody.value)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.CREATED({
			body: { recipients: result.value.recipients },
		})
	}
}

function makeBroadcastNoticeSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "Broadcast a notice",
		description:
			"Sends a notice as an in-app notification to every active user. Requires admin authentication.",
		security: true,
		body: broadcastNoticeBodySchema,
		responses: {
			201: {
				description: "Notice sent successfully",
				schema: broadcastNoticeResponseSchema,
			},
			400: { description: "Invalid notice", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden" },
		},
	})
}
