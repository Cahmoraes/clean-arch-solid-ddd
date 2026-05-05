import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { ZodError, z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server"
import { RATE_LIMIT_CONFIG } from "@/shared/infra/server/plugins/rate-limit-config.js"
import type { ActiveUserUseCase } from "@/user/application/use-case/active-user.usecase"
import { UserRoutes } from "./routes/user-routes"

const activateUserSchema = z.object({
	userId: z.string().uuid().meta({
		description: "User ID to activate",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class ActivateUserController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.ActivateUser)
		private readonly activeUser: ActiveUserUseCase,
	) {
		super()
		this.bindMethod()
	}

	private bindMethod() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	public async init(): Promise<void> {
		this.httpServer.register(
			"patch",
			UserRoutes.ACTIVATE_USER,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeActivateUserSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		if (error.name.endsWith("NotFoundError")) {
			return ResponseFactory.UNPROCESSABLE_ENTITY({
				message: error.message,
			})
		}

		return undefined
	}

	public async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseRequest(activateUserSchema, req.body)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}

		const result = await this.activeUser.execute({
			userId: parseBodyResult.value.userId,
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.OK()
	}
}

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeActivateUserSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Activate a user",
		description: "Activate a user account by ID. Requires authentication.",
		security: true,
		body: activateUserSchema,
		responses: {
			200: { description: "User activated successfully" },
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			422: {
				description: "Unprocessable Entity",
				schema: errorResponseSchema,
			},
		},
	})
}
