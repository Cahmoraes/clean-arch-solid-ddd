import { inject, injectable } from "inversify"
import { z } from "zod"
import type { ValidationError } from "zod-validation-error"
import { fromError } from "zod-validation-error"

import type { CheckInUseCase } from "@/check-in/application/use-case/check-in.usecase"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { Controller } from "@/shared/infra/controller/controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { CheckInRoutes } from "./routes/check-in-routes"

const checkInRequestSchema = z.object({
	userId: z.string().meta({
		description: "User ID performing check-in",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
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

type CheckInPayload = z.infer<typeof checkInRequestSchema>

@injectable()
export class CheckInController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.CheckIn)
		private readonly checkIn: CheckInUseCase,
	) {
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
				onlyAdmin: true,
			},
			makeCheckInSwaggerSchema(),
		)
	}

	private async callback(req: any) {
		const parsedBodyOrError = this.parseBody(req.body)
		if (parsedBodyOrError.isFailure()) {
			return ResponseFactory.create({
				status: HTTP_STATUS.BAD_REQUEST,
				message: parsedBodyOrError.value.message,
			})
		}
		const result = await this.checkIn.execute({
			userId: parsedBodyOrError.value.userId,
			gymId: parsedBodyOrError.value.gymId,
			userLatitude: parsedBodyOrError.value.userLatitude,
			userLongitude: parsedBodyOrError.value.userLongitude,
		})
		if (result.isFailure()) {
			return ResponseFactory.create({
				status: HTTP_STATUS.CONFLICT,
				message: result.value.message,
			})
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.CREATED,
			body: {
				message: "Check-in created",
				id: result.value.checkInId,
				date: result.value.date,
			},
		})
	}

	private parseBody(body: unknown): Either<ValidationError, CheckInPayload> {
		const parsedBody = checkInRequestSchema.safeParse(body)
		if (!parsedBody.success) return failure(fromError(parsedBody.error))
		return success(parsedBody.data)
	}
}

function makeCheckInSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "Create a check-in",
		description:
			"Create a check-in for a user at a gym. Validates proximity to gym. Requires ADMIN role",
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
