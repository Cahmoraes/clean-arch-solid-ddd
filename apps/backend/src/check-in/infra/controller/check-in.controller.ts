import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { ZodError, z } from "zod"
import type { CheckInUseCase } from "@/check-in/application/use-case/check-in.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server"
import { CheckInRoutes } from "./routes/check-in-routes"

const checkInRequestSchema = z.object({
	gymId: z.string().meta({
		description: "Gym ID for check-in",
		example: "660e8400-e29b-41d4-a716-446655440000",
	}),
	userLatitude: z
		.number()
		.meta({ description: "User current latitude", example: -23.5505 }),
	userLongitude: z
		.number()
		.meta({ description: "User current longitude", example: -46.6333 }),
})

export class CheckInController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.CheckIn)
		private readonly checkIn: CheckInUseCase,
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
			"post",
			CheckInRoutes.CREATE,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeCheckInSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		return ResponseFactory.CONFLICT({
			message: error.message,
		})
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(checkInRequestSchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.checkIn.execute({
			userId: req.user.sub.id,
			gymId: parsedBodyOrError.value.gymId,
			userLatitude: parsedBodyOrError.value.userLatitude,
			userLongitude: parsedBodyOrError.value.userLongitude,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: 201,
			body: {
				message: "Check-in created",
				id: result.value.checkInId,
				date: result.value.date,
			},
		})
	}
}

function makeCheckInSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "Create a check-in",
		description:
			"Create a check-in for a user at a gym. Validates proximity to gym.",
		security: true,
		body: checkInRequestSchema,
		responses: {
			201: {
				description: "Check-in created successfully",
				schema: z.object({
					message: z.string().meta({
						description: "Success message",
						example: "Check-in created",
					}),
					id: z.string().meta({
						description: "Check-in ID",
						example: "550e8400-e29b-41d4-a716-446655440000",
					}),
					date: z.string().meta({
						description: "Check-in date",
						example: "2024-01-01T10:00:00Z",
					}),
				}),
			},
			400: {
				description: "Invalid request body",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			409: {
				description: "Conflict - Already checked in or too far from gym",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
