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
import type { SuspendUserUseCase } from "@/user/application/use-case/suspend-user.usecase"
import { UserRoutes } from "./routes/user-routes"

const suspendUserSchema = z.object({
	userId: z.string().uuid().meta({
		description: "User ID to suspend",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class SuspendUserController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.SuspendUser)
		private readonly suspendUser: SuspendUserUseCase,
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
			UserRoutes.SUSPEND_USER,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
				rateLimit: {
					max: RATE_LIMIT_CONFIG.AUTH.MAX_MEMBER,
					timeWindow: RATE_LIMIT_CONFIG.AUTH.TIME_WINDOW,
				},
			},
			makeSuspendUserSwaggerSchema(),
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
		const parseBodyResult = this.parseRequest(suspendUserSchema, req.body)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}

		const result = await this.suspendUser.execute({
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

function makeSuspendUserSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Suspend a user",
		description:
			"Suspend a user account by ID. Requires authentication and admin role.",
		security: true,
		body: suspendUserSchema,
		responses: {
			200: { description: "User suspended successfully" },
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			403: { description: "Forbidden" },
			422: {
				description: "Unprocessable Entity",
				schema: errorResponseSchema,
			},
		},
	})
}
