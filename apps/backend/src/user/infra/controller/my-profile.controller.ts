import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { UserProfileUseCase } from "@/user/application/use-case/user-profile.usecase"
import { UserRoutes } from "./routes/user-routes"

export class MyProfileController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.UserProfile)
		private readonly userProfile: UserProfileUseCase,
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
	public async init(): Promise<void> {
		this.server.register(
			"get",
			UserRoutes.ME,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeMyProfileSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const user = req.user
		const result = await this.userProfile.execute({ userId: user.sub.id })
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: 200,
			body: result.value,
		})
	}
}

const myProfileResponseSchema = z.object({
	id: z.string().meta({ description: "User ID", example: "uuid-1234" }),
	name: z.string().meta({ description: "User name", example: "John Doe" }),
	email: z
		.string()
		.meta({ description: "User email", example: "john@example.com" }),
	role: z.string().meta({ description: "User role", example: "MEMBER" }),
	hasPassword: z.boolean().meta({
		description: "Whether the account has a local password",
		example: false,
	}),
	authMethods: z.array(z.string()).meta({
		description: "Enabled authentication methods",
		example: ["google"],
	}),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeMyProfileSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Get authenticated user profile",
		description: "Get the profile of the currently authenticated user.",
		security: true,
		responses: {
			200: {
				description: "Successful response",
				schema: myProfileResponseSchema,
			},
			401: { description: "Unauthorized" },
			404: { description: "User not found", schema: errorResponseSchema },
		},
	})
}
