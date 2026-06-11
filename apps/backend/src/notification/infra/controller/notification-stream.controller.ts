import type { FastifyReply, FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import type { SseManager } from "@/notification/infra/sse/sse-manager.js"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { NOTIFICATION_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { NotificationRoutes } from "./routes/notification-routes.js"

@injectable()
export class NotificationStreamController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(NOTIFICATION_TYPES.Infra.SseManager)
		private readonly sseManager: SseManager,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"get",
			NotificationRoutes.STREAM,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeNotificationStreamSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest, reply: FastifyReply) {
		const userId = req.user.sub.id
		reply.raw.statusCode = HTTP_STATUS.OK
		this.copyReplyHeadersToRaw(reply)
		reply.raw.setHeader("Content-Type", "text/event-stream")
		reply.raw.setHeader("Cache-Control", "no-cache")
		reply.raw.setHeader("Connection", "keep-alive")
		reply.raw.setHeader("X-Accel-Buffering", "no")
		reply.hijack()
		reply.raw.write(
			`data: ${JSON.stringify({ type: "connected", userId })}\n\n`,
		)
		this.sseManager.add(userId, reply)
		req.socket.on("close", () => {
			this.sseManager.remove(userId, reply)
		})
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: null,
		})
	}

	/**
	 * Headers set on the Fastify reply by plugins/hooks (e.g. @fastify/cors)
	 * are only flushed when Fastify serializes the response. Since this
	 * controller hijacks the reply and writes to the raw socket, those
	 * headers must be copied to the raw response manually.
	 */
	private copyReplyHeadersToRaw(reply: FastifyReply): void {
		for (const [name, value] of Object.entries(reply.getHeaders())) {
			if (value !== undefined) reply.raw.setHeader(name, value)
		}
	}
}

function makeNotificationStreamSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["notifications"],
		summary: "Stream notifications",
		description:
			"Open a Server-Sent Events stream with realtime notifications for the authenticated user.",
		security: true,
		responses: {
			200: { description: "SSE stream connected" },
			401: { description: "Unauthorized" },
		},
	})
}
