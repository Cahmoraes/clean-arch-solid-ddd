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
import type { UpdateMyProfileUseCase } from "@/user/application/use-case/update-my-profile.usecase"
import { UserRoutes } from "./routes/user-routes"

const updateMyProfileBodySchema = z.object({
	name: z
		.string()
		.min(5)
		.max(30)
		.meta({ description: "User name", example: "John Doe" }),
})

export class UpdateMyProfileController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.UpdateMyProfile)
		private readonly updateMyProfile: UpdateMyProfileUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅ | 🔒",
	})
	public async init() {
		this.httpServer.register(
			"patch",
			UserRoutes.ME,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeUpdateMyProfileSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}
		if (error.name.endsWith("NotFoundError")) {
			return ResponseFactory.create({
				status: 404,
				body: { message: error.message },
			})
		}
		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseRequest(
			updateMyProfileBodySchema,
			req.body,
		)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}

		const result = await this.updateMyProfile.execute({
			userId: req.user.sub.id,
			name: parseBodyResult.value.name,
		})

		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: 200,
			body: result.value,
		})
	}
}

const updateMyProfileResponseSchema = z.object({
	name: z
		.string()
		.meta({ description: "Updated user name", example: "John Doe" }),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeUpdateMyProfileSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Update authenticated user name",
		description: "Update the name of the currently authenticated user.",
		security: true,
		body: updateMyProfileBodySchema,
		responses: {
			200: {
				description: "Name updated successfully",
				schema: updateMyProfileResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			404: { description: "User not found", schema: errorResponseSchema },
			422: { description: "Unprocessable Entity", schema: errorResponseSchema },
		},
	})
}
