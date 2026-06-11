import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { UpdateGymUseCase } from "@/gym/application/use-case/update-gym.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const updateGymParamsSchema = z.object({
	gymId: z.string().min(1).meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

const updateGymBodySchema = z.object({
	cnpj: z.string().meta({ description: "Gym CNPJ", example: "12345678000100" }),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z
		.string()
		.optional()
		.meta({ description: "Gym description", example: "A great gym" }),
	phone: z
		.string()
		.optional()
		.meta({ description: "Gym phone number", example: "11999999999" }),
	latitude: z.number().meta({ description: "Gym latitude", example: -23.5505 }),
	longitude: z
		.number()
		.meta({ description: "Gym longitude", example: -46.6333 }),
	address: z.string().meta({
		description: "Full gym address",
		example: "Rua das Flores, 123, São Paulo - SP",
	}),
})

export type UpdateGymPayload = z.infer<typeof updateGymBodySchema>

export class UpdateGymController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.UpdateGym)
		private readonly updateGymUseCase: UpdateGymUseCase,
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
			"put",
			GymRoutes.UPDATE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeUpdateGymSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			updateGymParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const parsedBodyOrError = this.parseRequest(updateGymBodySchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.updateGymUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
			...parsedBodyOrError.value,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { message: "Gym updated", id: result.value.gymId },
		})
	}
}

function makeUpdateGymSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Update a gym",
		description:
			"Update an existing gym's registration data. Requires ADMIN role",
		security: true,
		params: updateGymParamsSchema,
		body: updateGymBodySchema,
		responses: {
			200: {
				description: "Gym updated successfully",
				schema: z.object({
					message: z.string().meta({ example: "Gym updated" }),
					id: z.string().meta({ description: "Updated gym ID" }),
				}),
			},
			400: {
				description: "Invalid request",
				schema: z.object({ message: z.string() }),
			},
			404: {
				description: "Gym not found",
				schema: z.object({ message: z.string() }),
			},
			409: {
				description: "Conflict - CNPJ already used by another gym",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
