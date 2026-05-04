import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import { PresenterFactory } from "@/shared/infra/presenter/presenter-factory"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { FetchUsersUseCase } from "@/user/application/use-case/fetch-users.usecase"
import { UserRoutes } from "./routes/user-routes"

const fetchUsersRequestSchema = z.object({
	limit: z.coerce
		.number()
		.meta({ description: "Number of users per page", example: 10 }),
	page: z.coerce.number().meta({ description: "Page number", example: 1 }),
})

export class FetchUsersController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.FetchUsers)
		private readonly fetchUsers: FetchUsersUseCase,
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
		this.httpServer.register(
			"get",
			UserRoutes.FETCH,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeFetchUsersSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedQueryParamsOrError = this.parseRequest(
			fetchUsersRequestSchema,
			req.query,
		)
		if (parsedQueryParamsOrError.isFailure()) {
			return this.createResponseError(parsedQueryParamsOrError)
		}

		const { limit, page } = parsedQueryParamsOrError.value
		const result = await this.fetchUsers.execute({
			limit,
			page,
		})

		return ResponseFactory.OK({
			body: {
				users: this.presenter(req.headers.accept).format(result.data),
				pagination: result.pagination,
			},
		})
	}

	private presenter(header?: string) {
		const presenter = PresenterFactory.create(header)
		return presenter
	}
}

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeFetchUsersSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "List all users",
		description: "Retrieve paginated list of users.",
		security: true,
		querystring: fetchUsersRequestSchema,
		responses: {
			200: {
				description: "Users list retrieved successfully",
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
		},
	})
}
