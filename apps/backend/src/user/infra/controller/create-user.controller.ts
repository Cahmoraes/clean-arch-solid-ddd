import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { CreateUserUseCase } from "@/user/application/use-case/create-user.usecase"
import { UserRoutes } from "./routes/user-routes"

const createUserRequestSchema = z.object({
	name: z.string().meta({ description: "User full name", example: "John Doe" }),
	email: z
		.string()
		.email()
		.meta({ description: "User email address", example: "john@example.com" }),
	password: z.string().min(8).max(128).meta({
		description: "User password (min 8 characters)",
		example: "secret123",
	}),
})

const createUserResponseSchema = z.object({
	message: z
		.string()
		.meta({ description: "Success message", example: "User created" }),
	email: z
		.string()
		.meta({ description: "Created user email", example: "john@example.com" }),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

export class CreateUserController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.CreateUser)
		private readonly createUser: CreateUserUseCase,
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
		await this.httpServer.register(
			"post",
			UserRoutes.CREATE,
			{
				callback: this.callback,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeCreateUserControllerSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseRequest(createUserRequestSchema, req.body)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}
		const { password, ...rest } = parseBodyResult.value
		const createUserResult = await this.createUser.execute({
			...rest,
			password,
		})
		if (createUserResult.isFailure()) {
			return this.createResponseError(createUserResult)
		}
		return ResponseFactory.CREATED({
			body: {
				message: "User created",
				email: createUserResult.value.email,
			},
		})
	}
}

function makeCreateUserControllerSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Create a new user",
		description: "Endpoint to create a new user with credentials.",
		body: createUserRequestSchema,
		responses: {
			201: {
				description: "User created successfully",
				schema: createUserResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			409: {
				description: "Conflict - User already exists",
				schema: errorResponseSchema,
			},
			422: { description: "Unprocessable Entity", schema: errorResponseSchema },
		},
	})
}
