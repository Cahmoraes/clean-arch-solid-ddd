import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { MarkAsReadUseCase } from "@/notification/application/use-case/mark-as-read.usecase.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

const markAsReadParamsSchema = z.object({
	id: z.uuid().meta({
		description: "Notification ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

const markAsReadResponseSchema = z.object({
	readAt: z.iso.datetime().meta({
		description: "ISO timestamp when notification was marked as read",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class MarkAsReadController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.UseCases.MarkAsRead)
		private readonly markAsRead: MarkAsReadUseCase,
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
			"patch",
			NotificationRoutes.MARK_AS_READ,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeMarkAsReadSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParams = this.parseRequest(markAsReadParamsSchema, req.params)
		if (parsedParams.isFailure()) {
			return this.createResponseError(parsedParams)
		}
		const result = await this.markAsRead.execute({
			notificationId: parsedParams.value.id,
			userId: req.user.sub.id,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.OK({
			body: {
				readAt: result.value.readAt.toISOString(),
			},
		})
	}
}

function makeMarkAsReadSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "Mark notification as read",
		description: "Mark a notification as read for the authenticated user.",
		security: true,
		params: markAsReadParamsSchema,
		responses: {
			200: {
				description: "Notification marked as read successfully",
				schema: markAsReadResponseSchema,
			},
			400: {
				description: "Invalid params",
				schema: errorResponseSchema,
			},
			401: { description: "Unauthorized" },
			404: {
				description: "Notification not found",
				schema: errorResponseSchema,
			},
		},
	})
}
