import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { ValidateCheckInUseCase } from "@/check-in/application/use-case/validate-check-in.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { CheckInRoutes } from "./routes/check-in-routes"

const validateCheckInRequestSchema = z.object({
	checkInId: z.string().meta({
		description: "Check-in ID to validate",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class ValidateCheckInController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.ValidateCheckIn)
		private readonly validateCheckInUseCase: ValidateCheckInUseCase,
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
	public async init(): Promise<void> {
		this.server.register(
			"post",
			CheckInRoutes.VALIDATE,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeValidateCheckInSwaggerSchema(),
		)
		this.server.register(
			"patch",
			CheckInRoutes.VALIDATE,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeValidateCheckInSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedRequest = this.parseRequest(
			validateCheckInRequestSchema,
			req.body,
		)
		if (parsedRequest.isFailure()) {
			return this.createResponseError(parsedRequest)
		}

		const result = await this.validateCheckInUseCase.execute(
			parsedRequest.value,
		)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { validatedAt: result.value.validatedAt },
		})
	}
}

function makeValidateCheckInSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "Validate a check-in",
		description: "Validate (confirm) an existing check-in. Requires ADMIN role",
		security: true,
		body: validateCheckInRequestSchema,
		responses: {
			200: {
				description: "Check-in validated successfully",
				schema: z.object({
					validatedAt: z.iso.datetime().meta({
						description: "ISO timestamp of when the check-in was validated",
						example: "2025-01-15T12:34:56.000Z",
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
				description: "Conflict - Check-in already validated or expired",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
