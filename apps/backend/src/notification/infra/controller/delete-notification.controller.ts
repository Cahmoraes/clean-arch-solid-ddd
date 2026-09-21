import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { DeleteNotificationUseCase } from "@/notification/application/use-case/delete-notification.usecase.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

const deleteNotificationParamsSchema = z.object({
	id: z.uuid().meta({
		description: "Notification ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class DeleteNotificationController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.UseCases.DeleteNotification)
		private readonly deleteNotification: DeleteNotificationUseCase,
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
			"delete",
			NotificationRoutes.DELETE,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeDeleteNotificationSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParams = this.parseRequest(
			deleteNotificationParamsSchema,
			req.params,
		)
		if (parsedParams.isFailure()) {
			return this.createResponseError(parsedParams)
		}
		const result = await this.deleteNotification.execute({
			notificationId: parsedParams.value.id,
			userId: req.user.sub.id,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.NO_CONTENT()
	}
}

function makeDeleteNotificationSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "Delete notification",
		description:
			"Soft-deletes a notification of the authenticated user. Responds 404 when it does not exist, belongs to another user or was already deleted.",
		security: true,
		params: deleteNotificationParamsSchema,
		responses: {
			204: { description: "Notification deleted successfully" },
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
