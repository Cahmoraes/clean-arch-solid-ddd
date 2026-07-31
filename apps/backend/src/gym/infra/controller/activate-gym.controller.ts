import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { ActivateGymUseCase } from "@/gym/application/use-case/activate-gym.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const activateGymParamsSchema = z.object({
	gymId: z.string().min(1).meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class ActivateGymController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.ActivateGym)
		private readonly activateGymUseCase: ActivateGymUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"patch",
			GymRoutes.ACTIVATE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeActivateGymSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			activateGymParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}
		const result = await this.activateGymUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { message: "Gym activated" },
		})
	}
}

function makeActivateGymSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Activate a gym",
		description:
			"Reactivates a previously deactivated gym, making it visible in listings/search again and allowing new check-ins. Requires ADMIN role",
		security: true,
		params: activateGymParamsSchema,
		responses: {
			200: {
				description: "Gym activated successfully",
				schema: z.object({
					message: z.string().meta({ example: "Gym activated" }),
				}),
			},
			404: {
				description: "Gym not found",
				schema: z.object({ message: z.string() }),
			},
			409: {
				description: "Conflict - gym is already activated",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
