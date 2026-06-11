import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import type { GetNotificationsUseCase } from "@/notification/application/use-case/get-notifications.usecase.js"
import type { Notification } from "@/notification/domain/notification.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

const getNotificationsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1).meta({
		description: "Page number",
		example: 1,
	}),
	unreadOnly: z.union([z.boolean(), z.stringbool()]).default(false).meta({
		description: "Filter only unread notifications",
		example: false,
	}),
})

const notificationItemSchema = z.object({
	id: z.uuid().meta({ description: "Notification ID" }),
	type: z
		.enum([
			"CHECK_IN_APPROVED",
			"CHECK_IN_REJECTED",
			"SECURITY_ALERT",
			"PROMOTION",
		])
		.meta({ description: "Notification type" }),
	title: z.string().meta({ description: "Notification title" }),
	message: z.string().meta({ description: "Notification message" }),
	gymName: z.string().nullable().meta({ description: "Gym name" }),
	reason: z.string().nullable().meta({ description: "Notification reason" }),
	readAt: z.iso.datetime().nullable().meta({
		description: "ISO timestamp when notification was read",
	}),
	createdAt: z.iso.datetime().meta({
		description: "ISO timestamp when notification was created",
	}),
})

const getNotificationsResponseSchema = z.object({
	notifications: z.array(notificationItemSchema).meta({
		description: "Notifications list",
	}),
	total: z.number().meta({ description: "Total notifications found" }),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class GetNotificationsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.UseCases.GetNotifications)
		private readonly getNotifications: GetNotificationsUseCase,
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
			NotificationRoutes.LIST,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeGetNotificationsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedQuery = this.parseRequest(
			getNotificationsQuerySchema,
			req.query,
		)
		if (parsedQuery.isFailure()) {
			return this.createResponseError(parsedQuery)
		}
		const result = await this.getNotifications.execute({
			userId: req.user.sub.id,
			page: parsedQuery.value.page,
			onlyUnread: parsedQuery.value.unreadOnly,
		})
		return ResponseFactory.OK({
			body: {
				notifications: result.value.items.map(notificationToResponse),
				total: result.value.total,
			},
		})
	}
}

function notificationToResponse(notification: Notification) {
	return {
		id: notification.id,
		type: notification.type,
		title: notification.title,
		message: notification.message,
		gymName: notification.gymName ?? null,
		reason: notification.reason ?? null,
		readAt: notification.readAt?.toISOString() ?? null,
		createdAt: notification.createdAt.toISOString(),
	}
}

function makeGetNotificationsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "List notifications",
		description: "List notifications for the authenticated user.",
		security: true,
		querystring: getNotificationsQuerySchema,
		responses: {
			200: {
				description: "Notifications retrieved successfully",
				schema: getNotificationsResponseSchema,
			},
			400: {
				description: "Invalid query params",
				schema: errorResponseSchema,
			},
			401: { description: "Unauthorized" },
		},
	})
}
