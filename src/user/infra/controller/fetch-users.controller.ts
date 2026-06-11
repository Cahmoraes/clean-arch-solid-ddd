import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { fromError, type ValidationError } from "zod-validation-error"

import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { Controller } from "@/shared/infra/controller/controller"
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

type FetchUsersRequest = z.infer<typeof fetchUsersRequestSchema>

@injectable()
export class FetchUsersController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.FetchUsers)
		private readonly fetchUsers: FetchUsersUseCase,
	) {
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
		const parsedQueryParamsOrError = this.parseQueryOrError(req.query)
		if (parsedQueryParamsOrError.isFailure()) {
			return ResponseFactory.BAD_REQUEST({
				message: parsedQueryParamsOrError.value.message,
			})
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

	private parseQueryOrError(
		body: unknown,
	): Either<ValidationError, FetchUsersRequest> {
		const parsedQueryParams = fetchUsersRequestSchema.safeParse(body)
		if (!parsedQueryParams.success) {
			return failure(fromError(parsedQueryParams.error))
		}
		return success(parsedQueryParams.data)
	}

	private presenter(header?: string) {
		const presenter = PresenterFactory.create(header)
		return presenter
	}
}

const userSchema = z.object({
	id: z.string().meta({ description: "User ID", example: "uuid-1234" }),
	name: z.string().meta({ description: "User name", example: "John Doe" }),
	email: z
		.string()
		.meta({ description: "User email", example: "john@example.com" }),
	role: z.string().meta({ description: "User role", example: "MEMBER" }),
})

const paginationSchema = z.object({
	page: z.number().meta({ description: "Current page", example: 1 }),
	limit: z.number().meta({ description: "Items per page", example: 10 }),
	total: z.number().meta({ description: "Total items", example: 50 }),
})

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
				schema: z.object({
					users: z.array(userSchema),
					pagination: paginationSchema,
				}),
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
		},
	})
}
