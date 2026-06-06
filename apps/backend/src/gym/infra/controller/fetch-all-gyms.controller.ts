import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { FetchAllGymsUseCase } from "@/gym/application/use-case/fetch-all-gyms.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const fetchAllGymsQuerySchema = z.object({
	page: z.coerce
		.number()
		.min(1)
		.optional()
		.meta({ description: "Page number for pagination", example: 1 }),
})

export class FetchAllGymsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.FetchAllGyms)
		private readonly fetchAllGymsUseCase: FetchAllGymsUseCase,
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
			GymRoutes.LIST,
			{ callback: this.callback },
			makeFetchAllGymsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedQueryOrError = this.parseRequest(
			fetchAllGymsQuerySchema,
			req.query,
		)
		if (parsedQueryOrError.isFailure()) {
			return this.createResponseError(parsedQueryOrError)
		}

		const result = await this.fetchAllGymsUseCase.execute({
			page: parsedQueryOrError.value.page ?? 1,
		})
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result,
		})
	}
}

function makeFetchAllGymsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "List all gyms",
		description: "Returns a paginated list of all registered gyms",
		security: true,
		querystring: fetchAllGymsQuerySchema,
		responses: {
			200: {
				description: "List of gyms",
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
						address: z
							.string()
							.nullable()
							.meta({ description: "Full gym address" }),
						imageKey: z
							.string()
							.nullable()
							.meta({ description: "Relative key of the gym image" }),
						latitude: z
							.number()
							.meta({ description: "Latitude", example: -23.5505 }),
						longitude: z
							.number()
							.meta({ description: "Longitude", example: -46.6333 }),
					}),
				),
			},
		},
	})
}
