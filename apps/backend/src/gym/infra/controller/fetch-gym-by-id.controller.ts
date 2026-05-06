import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type {
	FetchGymByIdUseCase,
	FetchGymByIdUseCaseOutputDTO,
} from "@/gym/application/use-case/fetch-gym-by-id.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const fetchGymByIdParamsSchema = z.object({
	gymId: z.string().min(1).meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class FetchGymByIdController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.FetchGymById)
		private readonly fetchGymByIdUseCase: FetchGymByIdUseCase,
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
			"get",
			GymRoutes.GET,
			{ callback: this.callback },
			makeFetchGymByIdSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			fetchGymByIdParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const result = await this.fetchGymByIdUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result.value,
		})
	}
}

const gymResponseSchema = z.object({
	id: z.string().meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z.string().nullable().meta({ description: "Gym description" }),
	phone: z.string().nullable().meta({ description: "Gym phone number" }),
	address: z.string().nullable().meta({ description: "Full gym address" }),
	latitude: z.number().meta({ description: "Latitude", example: -23.5505 }),
	longitude: z.number().meta({ description: "Longitude", example: -46.6333 }),
})

function makeFetchGymByIdSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Get gym by ID",
		description: "Retrieve a specific gym by its ID",
		security: true,
		params: fetchGymByIdParamsSchema,
		responses: {
			200: {
				description: "Gym retrieved successfully",
				schema: gymResponseSchema,
			},
			400: {
				description: "Invalid params",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			404: {
				description: "Gym not found",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}

export type FetchGymByIdOutput = FetchGymByIdUseCaseOutputDTO
