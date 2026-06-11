import type { FastifyReply, FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { fromError, type ValidationError } from "zod-validation-error"

import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { Controller } from "@/shared/infra/controller/controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import type { CookieManager } from "@/shared/infra/cookie/cookie-manager"
import { Logger } from "@/shared/infra/decorator/logger"
import { env } from "@/shared/infra/env"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

import { SessionRoutes } from "./routes/session-routes"

const authenticateRequestSchema = z.object({
	email: z
		.string()
		.email()
		.meta({ description: "User email address", example: "john@example.com" }),
	password: z
		.string()
		.min(6)
		.meta({ description: "User password", example: "secret123" }),
})

type AuthenticatePayload = z.infer<typeof authenticateRequestSchema>

@injectable()
export class AuthenticateController implements Controller {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(AUTH_TYPES.UseCases.Authenticate)
		private readonly authenticateUseCase: AuthenticateUseCase,
		@inject(SHARED_TYPES.Cookies.Manager)
		private readonly cookieManager: CookieManager,
	) {
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	public async init(): Promise<void> {
		this.server.register(
			"post",
			SessionRoutes.AUTHENTICATE,
			{
				callback: this.callback,
			},
			makeAuthenticateSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest, res: FastifyReply) {
		const parsedBodyResult = this.parseBodyResult(req.body)
		if (parsedBodyResult.isFailure())
			return ResponseFactory.create({
				status: HTTP_STATUS.BAD_REQUEST,
				message: parsedBodyResult.value.message,
			})
		const result = await this.authenticateUseCase.execute({
			email: parsedBodyResult.value.email,
			password: parsedBodyResult.value.password,
		})
		if (result.isFailure()) {
			return ResponseFactory.create({
				status: HTTP_STATUS.UNAUTHORIZED,
				message: "Invalid credentials",
			})
		}
		res.header(
			"set-cookie",
			this.encodeRefreshTokenCookie(result.value.refreshToken),
		)
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result.value,
		})
	}

	private encodeRefreshTokenCookie(aString: string): string {
		return this.cookieManager.serialize(env.REFRESH_TOKEN_NAME, aString, {
			path: "/",
			httpOnly: true,
			secure: true,
			sameSite: "strict",
		})
	}

	private parseBodyResult(
		body: unknown,
	): Either<ValidationError, AuthenticatePayload> {
		const parsedBody = authenticateRequestSchema.safeParse(body)
		if (!parsedBody.success) return failure(fromError(parsedBody.error))
		return success(parsedBody.data)
	}
}

function makeAuthenticateSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["sessions"],
		summary: "Authenticate user",
		description:
			"Authenticate with email and password to obtain JWT token and refresh token cookie",
		body: authenticateRequestSchema,
		responses: {
			200: {
				description: "Authentication successful",
				schema: z.object({
					token: z
						.string()
						.meta({ description: "JWT access token", example: "eyJhbG..." }),
					refreshToken: z
						.string()
						.meta({ description: "Refresh token", example: "eyJhbG..." }),
				}),
			},
			400: {
				description: "Invalid request body",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			401: {
				description: "Invalid credentials",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
