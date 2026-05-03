import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"

import type { FetchAllGymsUseCase } from "@/gym/application/use-case/fetch-all-gyms.usecase"
import type { Controller } from "@/shared/infra/controller/controller"
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

@injectable()
export class FetchAllGymsController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.FetchAllGyms)
		private readonly fetchAllGymsUseCase: FetchAllGymsUseCase,
	) {
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
		const page = this.parsePage(req.query)
		const result = await this.fetchAllGymsUseCase.execute({ page })
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result,
		})
	}

	private parsePage(query: unknown): number {
		return fetchAllGymsQuerySchema.parse(query).page ?? 1
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
