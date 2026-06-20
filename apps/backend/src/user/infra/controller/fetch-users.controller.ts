import type { FastifyReply, FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import {
	MimeType,
	PresenterFactory,
} from "@/shared/infra/presenter/presenter-factory"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { FetchUsersUseCase } from "@/user/application/use-case/fetch-users.usecase"
import { UserRoutes } from "./routes/user-routes"

const fetchUsersRequestSchema = z.object({
	limit: z.coerce
		.number()
		.meta({ description: "Number of users per page", example: 10 }),
	page: z.coerce.number().meta({ description: "Page number", example: 1 }),
	query: z
		.string()
		.max(100)
		.optional()
		.meta({ description: "Search by name or email", example: "joao" }),
	role: z
		.enum(["MEMBER", "ADMIN"])
		.optional()
		.meta({ description: "Filter by role", example: "MEMBER" }),
	status: z
		.enum(["active", "inactive"])
		.optional()
		.meta({ description: "Filter by status", example: "active" }),
})

@injectable()
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

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.httpServer.register(
			"get",
			UserRoutes.FETCH,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeFetchUsersSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest, reply: FastifyReply) {
		const parsedQueryParamsOrError = this.parseRequest(
			fetchUsersRequestSchema,
			req.query,
		)
		if (parsedQueryParamsOrError.isFailure()) {
			return this.createResponseError(parsedQueryParamsOrError)
		}

		const { limit, page, query, role, status } = parsedQueryParamsOrError.value
		const result = await this.fetchUsers.execute({
			limit,
			page,
			query,
			role,
			status,
		})
		const users = this.presenter(req.headers.accept).format(result.data)
		if (req.headers.accept === MimeType.CSV) {
			reply.header("Content-Type", MimeType.CSV)
			return ResponseFactory.OK({ body: users })
		}

		return ResponseFactory.OK({
			body: {
				users,
				pagination: result.pagination,
			},
		})
	}

	private presenter(header?: string) {
		return PresenterFactory.create(header)
	}
}

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

const userItemSchema = z.object({
	id: z.uuid().meta({ description: "User ID" }),
	name: z.string().meta({ description: "User full name" }),
	email: z.email().meta({ description: "User email" }),
	role: z.enum(["ADMIN", "MEMBER"]).meta({ description: "User role" }),
	status: z
		.enum(["activated", "suspended", "locked"])
		.meta({ description: "User status" }),
	createdAt: z.string().meta({ description: "User creation date" }),
	isSuperAdmin: z
		.boolean()
		.meta({ description: "Whether the user is a super admin" }),
})

const fetchUsersResponseSchema = z.object({
	users: z.array(userItemSchema).meta({ description: "List of users" }),
	pagination: z
		.object({
			total: z.number().meta({ description: "Total number of users" }),
			page: z.number().meta({ description: "Current page" }),
			limit: z.number().meta({ description: "Users per page" }),
		})
		.meta({ description: "Pagination metadata" }),
})

function makeFetchUsersSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "List all users",
		description:
			"Retrieve paginated list of users. Requires authentication and admin role.",
		security: true,
		querystring: fetchUsersRequestSchema,
		responses: {
			200: {
				description: "Users list retrieved successfully",
				schema: fetchUsersResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden", schema: errorResponseSchema },
		},
	})
}
