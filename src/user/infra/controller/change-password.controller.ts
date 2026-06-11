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
import type { ChangePasswordUseCase } from "@/user/application/use-case/change-password.usecase"

import { UserRoutes } from "./routes/user-routes"

const changePasswordSchema = z.object({
	newRawPassword: z.string().min(6).meta({
		description: "New password (min 6 characters)",
		example: "newpass123",
	}),
})

type ChangePasswordPayload = z.infer<typeof changePasswordSchema>

@injectable()
export class ChangePasswordController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.ChangePassword)
		private readonly changePassword: ChangePasswordUseCase,
	) {
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅ | 🔒",
	})
	public async init() {
		this.server.register(
			"patch",
			UserRoutes.CHANGE_PASSWORD,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeChangePasswordSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseBodyOrError(req.body)
		if (parsedBodyOrError.isFailure()) {
			return ResponseFactory.BAD_REQUEST({
				message: parsedBodyOrError.value.message,
			})
		}
		const result = await this.changePassword.execute({
			userId: this.extractUserId(req),
			newRawPassword: parsedBodyOrError.value.newRawPassword,
		})
		if (result.isFailure()) {
			return ResponseFactory.CONFLICT({
				message: result.value.message,
			})
		}
		return ResponseFactory.NO_CONTENT()
	}

	private parseBodyOrError(
		body: unknown,
	): Either<ValidationError, ChangePasswordPayload> {
		const parsedBody = changePasswordSchema.safeParse(body)
		if (!parsedBody.success) return failure(fromError(parsedBody.error))
		return success(parsedBody.data)
	}

	private extractUserId(req: FastifyRequest): string {
		return req.user.sub.id
	}
}

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

function makeChangePasswordSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Change user password",
		description: "Change the password of the currently authenticated user.",
		security: true,
		body: changePasswordSchema,
		responses: {
			204: { description: "Password changed successfully" },
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized" },
			409: { description: "Conflict", schema: errorResponseSchema },
		},
	})
}
