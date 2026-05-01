import { inject, injectable } from "inversify"
import { z } from "zod"

import type { HealthCheckImpl } from "../health/health-check.impl"
import { HEALTH_CHECK_TYPES, SHARED_TYPES } from "../ioc/types"
import { OpenApiSchemaBuilder } from "../openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "../server/http-server"
import type { Controller } from "./controller"
import { ResponseFactory } from "./factory/response-factory"
import { HealthCheckRoutes } from "./routes/health-check-routes"

@injectable()
export class HealthCheckController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(HEALTH_CHECK_TYPES.Service)
		private readonly healthCheckService: HealthCheckImpl,
	) {
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	public async init(): Promise<void> {
		this.httpServer.register(
			"get",
			HealthCheckRoutes.check,
			{
				callback: this.callback,
			},
			makeHealthCheckSwaggerSchema(),
		)
	}

	private async callback() {
		const healthStatus = await this.healthCheckService.check()
		return ResponseFactory.OK({
			body: { status: healthStatus.status },
		})
	}
}

function makeHealthCheckSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["health"],
		summary: "Health check",
		description: "Check if the API is healthy and responding",
		responses: {
			200: {
				description: "API is healthy",
				schema: z.object({ status: z.string() }),
			},
		},
	})
}
