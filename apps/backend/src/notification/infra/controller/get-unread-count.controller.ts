import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { GetUnreadCountUseCase } from "@/notification/application/use-case/get-unread-count.usecase.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

const getUnreadCountResponseSchema = z.object({
	count: z.number().meta({ description: "Unread notifications count" }),
})

@injectable()
export class GetUnreadCountController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.UseCases.GetUnreadCount)
		private readonly getUnreadCount: GetUnreadCountUseCase,
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
			"get",
			NotificationRoutes.UNREAD_COUNT,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeGetUnreadCountSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const result = await this.getUnreadCount.execute({
			userId: req.user.sub.id,
		})
		return ResponseFactory.OK({ body: result.value })
	}
}

function makeGetUnreadCountSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "Get unread notifications count",
		description:
			"Get the unread notifications count for the authenticated user.",
		security: true,
		responses: {
			200: {
				description: "Unread notifications count retrieved successfully",
				schema: getUnreadCountResponseSchema,
			},
			401: { description: "Unauthorized" },
		},
	})
}
