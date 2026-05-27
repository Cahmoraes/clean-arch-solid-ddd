import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { GetUserStatsUseCase } from "@/user/application/use-case/get-user-stats.usecase"
import { UserRoutes } from "./routes/user-routes"

@injectable()
export class GetUserStatsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.GetUserStats)
		private readonly getUserStats: GetUserStatsUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"get",
			UserRoutes.STATS,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeGetUserStatsSwaggerSchema(),
		)
	}

	private async callback(_req: FastifyRequest) {
		const stats = await this.getUserStats.execute()
		return ResponseFactory.OK({ body: stats })
	}
}

const statsResponseSchema = z.object({
	total: z.number().meta({ description: "Total de usuários" }),
	members: z.number().meta({ description: "Total de membros" }),
	admins: z.number().meta({ description: "Total de administradores" }),
	active: z.number().meta({ description: "Total de usuários ativos" }),
	inactive: z.number().meta({ description: "Total de usuários inativos" }),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeGetUserStatsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get user statistics",
		description:
			"Returns user counts by category. Requires authentication and admin role.",
		security: true,
		responses: {
			200: {
				description: "User statistics retrieved successfully",
				schema: statsResponseSchema,
			},
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
		},
	})
}
