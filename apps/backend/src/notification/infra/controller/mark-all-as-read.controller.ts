import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { MarkAllAsReadUseCase } from "@/notification/application/use-case/mark-all-as-read.usecase.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

const markAllAsReadResponseSchema = z.object({
	markedCount: z.number().meta({
		description: "Number of notifications marked as read",
	}),
})

@injectable()
export class MarkAllAsReadController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.UseCases.MarkAllAsRead)
		private readonly markAllAsRead: MarkAllAsReadUseCase,
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
			NotificationRoutes.MARK_ALL_AS_READ,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeMarkAllAsReadSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const result = await this.markAllAsRead.execute({
			userId: req.user.sub.id,
		})
		return ResponseFactory.OK({ body: result.value })
	}
}

function makeMarkAllAsReadSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "Mark all notifications as read",
		description:
			"Mark all unread notifications as read for the authenticated user.",
		security: true,
		responses: {
			200: {
				description: "Notifications marked as read successfully",
				schema: markAllAsReadResponseSchema,
			},
			401: { description: "Unauthorized" },
		},
	})
}
