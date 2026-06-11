import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { fromError } from "zod-validation-error"

import type { ValidateCheckInUseCase } from "@/check-in/application/use-case/validate-check-in.usecase"
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

const validateCheckInRequestSchema = z.object({
	checkInId: z.string().meta({
		description: "Check-in ID to validate",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

type ValidateCheckInPayload = z.infer<typeof validateCheckInRequestSchema>

@injectable()
export class ValidateCheckInController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.ValidateCheckIn)
		private readonly validateCheckInUseCase: ValidateCheckInUseCase,
	) {
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
	}

	private async callback(req: FastifyRequest) {
		const parsedRequest = this.parseBodyPayload(req.body)
		if (parsedRequest.isFailure()) {
			return ResponseFactory.create({
				status: HTTP_STATUS.BAD_REQUEST,
				message: parsedRequest.value.message,
			})
		}
		const result = await this.validateCheckInUseCase.execute(
			parsedRequest.value,
		)
		if (result.isFailure()) {
			return ResponseFactory.create({
				status: HTTP_STATUS.CONFLICT,
				message: result.value.message,
			})
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { checkInId: parsedRequest.value.checkInId },
		})
	}

	private parseBodyPayload(
		body: unknown,
	): Either<Error, ValidateCheckInPayload> {
		const parsedBody = validateCheckInRequestSchema.safeParse(body)
		if (!parsedBody.success) return failure(fromError(parsedBody.error))
		return success(parsedBody.data)
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
					checkInId: z.string().meta({
						description: "Validated check-in ID",
						example: "550e8400-e29b-41d4-a716-446655440000",
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
