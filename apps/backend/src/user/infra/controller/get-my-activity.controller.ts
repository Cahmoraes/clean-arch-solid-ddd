import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { GetUserActivityUseCase } from "@/user/application/use-case/get-user-activity.usecase"
import { UserRoutes } from "./routes/user-routes"

const getMyActivityQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1).meta({
		description: "Page number",
		example: 1,
	}),
})

export class GetMyActivityController extends BaseController {
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
			UserRoutes.MY_ACTIVITY,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeGetMyActivitySwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedQuery = this.parseRequest(getMyActivityQuerySchema, req.query)
		if (parsedQuery.isFailure()) {
			return this.createResponseError(parsedQuery)
		}

		const result = await this.getUserActivity.execute({
			userId: req.user.sub.id,
			page: parsedQuery.value.page,
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

const getMyActivityResponseSchema = z.object({
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

function makeGetMyActivitySwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get my activity history",
		description:
			"Retrieve a paginated activity history for the authenticated user.",
		security: true,
		querystring: getMyActivityQuerySchema,
		responses: {
			200: {
				description: "User activity retrieved successfully",
				schema: getMyActivityResponseSchema,
			},
			401: { description: "Unauthorized" },
			404: { description: "User not found", schema: errorResponseSchema },
		},
	})
}
