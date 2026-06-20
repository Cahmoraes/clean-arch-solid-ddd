import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { UpdateUserProfileUseCase } from "@/user/application/use-case/update-user-profile.usecase"
import { UserRoutes } from "./routes/user-routes"

const updateUserProfileRequestSchema = z.object({
	userId: z.string().meta({ description: "User ID", example: "uuid-1234" }),
})

const updateUserProfileBodySchema = z.object({
	name: z.string().meta({ description: "User name", example: "John Doe" }),
	email: z
		.string()
		.email()
		.meta({ description: "User email", example: "john@example.com" }),
})

export class UpdateUserProfileController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.UpdateUserProfile)
		private readonly updateUserProfile: UpdateUserProfileUseCase,
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
		this.httpServer.register(
			"patch",
			UserRoutes.PROFILE,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeUpdateUserProfileSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parseRequestResult = this.parseRequest(
			updateUserProfileRequestSchema,
			req.params,
		)
		if (parseRequestResult.isFailure()) {
			return this.createResponseError(parseRequestResult)
		}

		const parseBodyResult = this.parseRequest(
			updateUserProfileBodySchema,
			req.body,
		)
		if (parseBodyResult.isFailure()) {
			return this.createResponseError(parseBodyResult)
		}

		const profileUpdateResult = await this.updateUserProfile.execute({
			requesterId: req.user.sub.id,
			userId: parseRequestResult.value.userId,
			email: parseBodyResult.value.email,
			name: parseBodyResult.value.name,
		})

		if (profileUpdateResult.isFailure()) {
			return this.createResponseError(profileUpdateResult)
		}

		return ResponseFactory.CREATED({
			body: {
				message: "User created",
				email: profileUpdateResult.value.email,
			},
		})
	}
}

const updateUserProfileResponseSchema = z.object({
	message: z
		.string()
		.meta({ description: "Success message", example: "User created" }),
	email: z
		.string()
		.meta({ description: "Updated user email", example: "john@example.com" }),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeUpdateUserProfileSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Update user profile",
		description: "Update name and email of a specific user.",
		security: true,
		params: updateUserProfileRequestSchema,
		body: updateUserProfileBodySchema,
		responses: {
			201: {
				description: "User profile updated successfully",
				schema: updateUserProfileResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			422: {
				description: "Unprocessable Entity",
				schema: errorResponseSchema,
			},
		},
	})
}
