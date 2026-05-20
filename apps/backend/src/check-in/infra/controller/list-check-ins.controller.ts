import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { FetchCheckInsUseCase } from "@/check-in/application/use-case/fetch-check-ins.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { CheckInRoutes } from "./routes/check-in-routes"

const listCheckInsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1).meta({
		description: "Page number",
		example: 1,
	}),
	status: z.enum(["pending", "validated", "rejected"]).optional().meta({
		description: "Filter by status",
		example: "pending",
	}),
})

export class ListCheckInsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.FetchCheckIns)
		private readonly fetchCheckIns: FetchCheckInsUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	async init() {
		this.server.register(
			"get",
			CheckInRoutes.LIST,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeListCheckInsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedQuery = this.parseRequest(listCheckInsQuerySchema, req.query)
		if (parsedQuery.isFailure()) {
			return this.createResponseError(parsedQuery)
		}

		const result = await this.fetchCheckIns.execute({
			page: parsedQuery.value.page,
			status: parsedQuery.value.status,
		})
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result,
		})
	}
}

function makeListCheckInsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "List check-ins",
		description:
			"List all check-ins with optional status filter. Requires ADMIN role",
		security: true,
		querystring: listCheckInsQuerySchema,
		responses: {
			200: {
				description: "Check-ins list retrieved successfully",
				schema: z.object({
					items: z.array(
						z.object({
							id: z.string().meta({ description: "Check-in ID" }),
							userId: z.string().meta({ description: "User ID" }),
							gymId: z.string().meta({ description: "Gym ID" }),
							gymTitle: z
								.string()
								.nullable()
								.meta({ description: "Gym name or null if not found" }),
							createdAt: z
								.string()
								.meta({ description: "Creation date (ISO)" }),
							validatedAt: z
								.string()
								.nullable()
								.meta({ description: "Validation date (ISO) or null" }),
							rejectedAt: z
								.string()
								.nullable()
								.meta({ description: "Rejection date (ISO) or null" }),
							status: z
								.enum(["pending", "validated", "rejected"])
								.meta({ description: "Computed check-in status" }),
							latitude: z.number().meta({ description: "Latitude" }),
							longitude: z.number().meta({ description: "Longitude" }),
						}),
					),
					page: z.number().meta({ description: "Current page" }),
					total: z.number().meta({ description: "Total items" }),
				}),
			},
			400: {
				description: "Invalid query params",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
