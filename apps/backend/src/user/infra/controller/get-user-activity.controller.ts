import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import {
	type GetUserActivityUseCase,
	USER_ACTIVITY_PAGE_SIZE,
} from "@/user/application/use-case/get-user-activity.usecase"
import { UserRoutes } from "./routes/user-routes"

const getUserActivityRequestSchema = z.object({
	userId: z.string().meta({ description: "User ID", example: "uuid-1234" }),
})

const MAX_ACTIVITY_PAGE = Math.floor(
	Number.MAX_SAFE_INTEGER / USER_ACTIVITY_PAGE_SIZE,
)

const getUserActivityQuerySchema = z.object({
	page: z.coerce.number().int().min(1).max(MAX_ACTIVITY_PAGE).optional().meta({
		description: "Page number",
		example: 1,
		default: 1,
	}),
})

export type GetUserActivityPayload = z.infer<
	typeof getUserActivityRequestSchema
>

export class GetUserActivityController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.GetUserActivity)
		private readonly getUserActivity: GetUserActivityUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅ | 🔒",
	})
	async init() {
		this.server.register(
			"get",
			UserRoutes.ACTIVITY,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeGetUserActivitySwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parseParamsResult = this.parseRequest(
			getUserActivityRequestSchema,
			req.params,
		)
		if (parseParamsResult.isFailure()) {
			return this.createResponseError(parseParamsResult)
		}

		const parseQueryResult = this.parseRequest(
			getUserActivityQuerySchema,
			req.query,
		)
		if (parseQueryResult.isFailure()) {
			return this.createResponseError(parseQueryResult)
		}

		const result = await this.getUserActivity.execute({
			userId: parseParamsResult.value.userId,
			page: parseQueryResult.value.page ?? 1,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: 200,
			body: result.value,
		})
	}
}

const ACTIVITY_EVENT_TYPES = [
	"LOGIN",
	"PASSWORD_CHANGED",
	"ACCOUNT_LOCKED",
	"GOOGLE_LINKED",
	"PROFILE_UPDATED",
	"ROLE_CHANGED",
	"STATUS_CHANGED",
	"CHECK_IN",
] as const

const activityEventResponseSchema = z.object({
	id: z.string(),
	type: z.enum(ACTIVITY_EVENT_TYPES),
	description: z.string(),
	occurredAt: z.string(),
})

const getUserActivityResponseSchema = z.object({
	events: z.array(activityEventResponseSchema),
	pagination: z.object({
		page: z.number().int().meta({ description: "Current page" }),
		pageSize: z.number().int().meta({ description: "Events per page" }),
		total: z.number().int().meta({ description: "Total events" }),
		totalPages: z.number().int().meta({ description: "Total pages" }),
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeGetUserActivitySwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get user activity history",
		description: "Retrieve a paginated activity history for a specific user.",
		security: true,
		params: getUserActivityRequestSchema,
		querystring: getUserActivityQuerySchema,
		responses: {
			200: {
				description: "User activity retrieved successfully",
				schema: getUserActivityResponseSchema,
			},
			400: {
				description: "Invalid query params",
				schema: errorResponseSchema,
			},
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
			404: { description: "User not found", schema: errorResponseSchema },
		},
	})
}
