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
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import type { ActiveUserUseCase } from "@/user/application/use-case/active-user.usecase"

import { UserRoutes } from "./routes/user-routes"

const activateUserSchema = z.object({
	userId: z.string().uuid().meta({
		description: "User ID to activate",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

type ActivateUserPayload = z.infer<typeof activateUserSchema>

@injectable()
export class ActivateUserController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(USER_TYPES.UseCases.ActivateUser)
		private readonly activeUser: ActiveUserUseCase,
	) {
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
			},
			makeActivateUserSwaggerSchema(),
		)
	}

	public async callback(req: FastifyRequest) {
		const parseBodyResult = this.parseBodyResult(req.body)
		if (parseBodyResult.isFailure()) {
			return ResponseFactory.BAD_REQUEST({
				body: parseBodyResult.value.message,
			})
		}
		const result = await this.activeUser.execute({
			userId: parseBodyResult.value.userId,
		})
		if (result.isFailure()) {
			return ResponseFactory.UNPROCESSABLE_ENTITY({
				body: result.value.message,
			})
		}
		return ResponseFactory.OK()
	}

	private parseBodyResult(
		body: unknown,
	): Either<ValidationError, ActivateUserPayload> {
		const parseBody = activateUserSchema.safeParse(body)
		if (!parseBody.success) return failure(fromError(parseBody.error))
		return success(parseBody.data)
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
