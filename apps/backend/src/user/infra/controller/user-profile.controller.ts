import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"

import type { Controller } from "@/shared/infra/controller/controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import type { UserProfileUseCase } from "@/user/application/use-case/user-profile.usecase"

import { UserRoutes } from "./routes/user-routes"

const userProfileRequestSchema = z.object({
	userId: z.string().meta({ description: "User ID", example: "uuid-1234" }),
})

export type UserProfilePayload = z.infer<typeof userProfileRequestSchema>

@injectable()
export class UserProfileController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.UserProfile)
		private readonly userProfile: UserProfileUseCase,
	) {
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅ | 🔒",
	})
	async init() {
		this.server.register(
			"get",
			UserRoutes.PROFILE,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeUserProfileSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const { userId } = this.parseParamsOrThrow(req.params)
		const result = await this.userProfile.execute({ userId })
		if (result.isFailure()) {
			return ResponseFactory.create({
				status: HTTP_STATUS.NOT_FOUND,
				message: "User not found",
			})
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result.value,
		})
	}

	private parseParamsOrThrow(params: unknown): UserProfilePayload {
		return userProfileRequestSchema.parse(params)
	}
}

const userProfileResponseSchema = z.object({
	id: z.string().meta({ description: "User ID", example: "uuid-1234" }),
	name: z.string().meta({ description: "User name", example: "John Doe" }),
	email: z
		.string()
		.meta({ description: "User email", example: "john@example.com" }),
	role: z.string().meta({ description: "User role", example: "MEMBER" }),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeUserProfileSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get user profile by ID",
		description: "Retrieve a specific user profile by their ID.",
		security: true,
		params: userProfileRequestSchema,
		responses: {
			200: {
				description: "User profile retrieved successfully",
				schema: userProfileResponseSchema,
			},
			401: { description: "Unauthorized" },
			404: { description: "User not found", schema: errorResponseSchema },
		},
	})
}
