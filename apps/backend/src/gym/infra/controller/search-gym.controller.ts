import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type {
	SearchGymUseCase,
	SearchGymUseCaseOutput,
} from "@/gym/application/use-case/search-gym.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const searchGymRequestSchema = z.object({
	name: z.string().meta({ description: "Gym name to search", example: "Iron" }),
})

export type SearchGymPayload = z.infer<typeof searchGymRequestSchema>

const searchGymParamsSchema = z.object({
	page: z.coerce
		.number()
		.optional()
		.meta({ description: "Page number for pagination", example: 1 }),
})

export class SearchGymController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.SearchGym)
		private readonly searchGymUseCase: SearchGymUseCase,
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
	public async init() {
		this.server.register(
			"get",
			GymRoutes.SEARCH,
			{
				callback: this.callback,
			},
			makeSearchGymSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			searchGymRequestSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const parsedQueryOrError = this.parseRequest(
			searchGymParamsSchema,
			req.query,
		)
		if (parsedQueryOrError.isFailure()) {
			return this.createResponseError(parsedQueryOrError)
		}

		const result = await this.searchGymUseCase.execute({
			name: parsedParamsOrError.value.name,
			page: parsedQueryOrError.value.page,
		})
		if (this.isGymNotFound(result)) {
			return ResponseFactory.create({
				status: HTTP_STATUS.NOT_FOUND,
				message: "Gym not found",
			})
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result,
		})
	}

	private isGymNotFound(result: SearchGymUseCaseOutput[]): boolean {
		return !result.length
	}
}

function makeSearchGymSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Search gyms by name",
		description: "Search for gyms by name with pagination support",
		security: true,
		params: searchGymRequestSchema,
		querystring: searchGymParamsSchema,
		responses: {
			200: {
				description: "List of gyms matching the search",
				schema: z.array(
					z.object({
						id: z.string().meta({
							description: "Gym ID",
							example: "550e8400-e29b-41d4-a716-446655440000",
						}),
						title: z
							.string()
							.meta({ description: "Gym name", example: "Iron Gym" }),
						description: z
							.string()
							.nullable()
							.meta({ description: "Gym description" }),
						phone: z
							.string()
							.nullable()
							.meta({ description: "Gym phone number" }),
						latitude: z
							.number()
							.meta({ description: "Latitude", example: -23.5505 }),
						longitude: z
							.number()
							.meta({ description: "Longitude", example: -46.6333 }),
					}),
				),
			},
			400: {
				description: "Invalid params",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			404: {
				description: "No gyms found",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
