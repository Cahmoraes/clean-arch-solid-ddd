import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { RejectCheckInUseCase } from "@/check-in/application/use-case/reject-check-in.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { CheckInRoutes } from "./routes/check-in-routes"

const rejectCheckInRequestSchema = z.object({
	checkInId: z.string().meta({
		description: "Check-in ID to reject",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class RejectCheckInController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.RejectCheckIn)
		private readonly rejectCheckInUseCase: RejectCheckInUseCase,
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
			"patch",
			CheckInRoutes.REJECT,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeRejectCheckInSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedRequest = this.parseRequest(
			rejectCheckInRequestSchema,
			req.body,
		)
		if (parsedRequest.isFailure()) {
			return this.createResponseError(parsedRequest)
		}

		const result = await this.rejectCheckInUseCase.execute(parsedRequest.value)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { rejectedAt: result.value.rejectedAt },
		})
	}
}

function makeRejectCheckInSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "Reject a check-in",
		description: "Reject (cancel) an existing check-in. Requires ADMIN role",
		security: true,
		body: rejectCheckInRequestSchema,
		responses: {
			200: {
				description: "Check-in rejected successfully",
				schema: z.object({
					rejectedAt: z.iso.datetime().meta({
						description: "ISO timestamp of when the check-in was rejected",
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
			404: {
				description: "Check-in not found",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
