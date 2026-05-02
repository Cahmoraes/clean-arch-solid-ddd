import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { fromError, type ValidationError } from "zod-validation-error"
import {
	type Either,
	type Failure,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { Controller } from "@/shared/infra/controller/controller"
import {
	ResponseFactory,
	type ResponseOutput,
} from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { UserAlreadyExistsError } from "@/user/application/error/user-already-exists-error"
import type {
	CreateUserError,
	CreateUserUseCase,
} from "@/user/application/use-case/create-user.usecase"
import type { UserValidationErrors } from "@/user/domain/user"
import { RoleValues } from "@/user/domain/value-object/role"
import { UserRoutes } from "./routes/user-routes"

const createUserRequestSchema = z.object({
	name: z.string().meta({ description: "User full name", example: "John Doe" }),
	email: z
		.string()
		.email()
		.meta({ description: "User email address", example: "john@example.com" }),
	password: z.string().min(6).meta({
		description: "User password (min 6 characters)",
		example: "secret123",
	}),
	role: z
		.enum([RoleValues.ADMIN, RoleValues.MEMBER])
		.optional()
		.default("MEMBER")
		.meta({ description: "User role", example: "MEMBER" }),
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

type CreateUserPayload = z.infer<typeof createUserRequestSchema>

@injectable()
export class CreateUserController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.CreateUser)
		private readonly createUser: CreateUserUseCase,
	) {
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
			},
			makeCreateUserControllerSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseBodyOrError(req.body)
		if (parseBodyResult.isFailure()) {
			return ResponseFactory.BAD_REQUEST({
				message: parseBodyResult.value.message,
			})
		}
		const { password, ...rest } = parseBodyResult.value
		const createUserResult = await this.createUser.execute({
			...rest,
			password: password,
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

	private parseBodyOrError(
		body: unknown,
	): Either<ValidationError, CreateUserPayload> {
		const createUserValidationResult = createUserRequestSchema.safeParse(body)
		if (!createUserValidationResult.success) {
			return failure(fromError(createUserValidationResult.error))
		}
		return success(createUserValidationResult.data)
	}

	private createResponseError(
		result: Failure<CreateUserError, unknown>,
	): ResponseOutput {
		if (result.value instanceof UserAlreadyExistsError) {
			return ResponseFactory.CONFLICT({
				message: result.value.message,
			})
		}
		return ResponseFactory.UNPROCESSABLE_ENTITY({
			message: this.extractErrorMessages(result.value),
		})
	}

	private extractErrorMessages(errors: UserValidationErrors[]): string {
		return errors.flatMap((error) => error.message).join(", ")
	}
}

function makeCreateUserControllerSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Create a new user",
		description: "Endpoint to create a new user with role and credentials.",
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
