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
import type { DefinePasswordUseCase } from "@/user/application/use-case/define-password.usecase"
import { UserRoutes } from "./routes/user-routes"

const definePasswordSchema = z.object({
	provider: z.enum(["google"]).meta({
		description: "External provider linked to the account",
		example: "google",
	}),
	reauthGrant: z.string().min(1).meta({
		description: "Single-use reauthentication grant",
		example: "1cb3a5d4-b6ec-4c15-b8d5-b76740626d03",
	}),
	newRawPassword: z.string().min(8).max(128).meta({
		description: "New local password",
		example: "Senha123!",
	}),
})

const errorResponseSchema = z.object({
	code: z.string().optional().meta({ description: "Error code" }),
	message: z.string().meta({ description: "Error message" }),
})

export class DefinePasswordController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.DefinePassword)
		private readonly definePassword: DefinePasswordUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods(): void {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅ | 🔒",
	})
	public async init(): Promise<void> {
		this.server.register(
			"post",
			UserRoutes.PASSWORD,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeDefinePasswordSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		if (error.name === "PasswordAlreadySetError") {
			return ResponseFactory.CONFLICT({
				code: "password_already_set",
				message: "Password already set for this account",
			})
		}

		if (error.name === "ExternalProviderNotLinkedError") {
			return ResponseFactory.CONFLICT({
				code: "external_provider_not_linked",
				message: "External provider not linked to this account",
			})
		}

		if (error.name === "ReauthGrantInvalidError") {
			return ResponseFactory.UNAUTHORIZED({
				code: "reauth_grant_invalid",
				message: "Reauth grant is invalid or expired",
			})
		}

		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(definePasswordSchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.definePassword.execute({
			userId: req.user.sub.id,
			provider: parsedBodyOrError.value.provider,
			reauthGrant: parsedBodyOrError.value.reauthGrant,
			newRawPassword: parsedBodyOrError.value.newRawPassword,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.NO_CONTENT()
	}
}

function makeDefinePasswordSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Define first local password",
		description:
			"Consume a recent reauthentication grant to set the first local password for the authenticated user.",
		security: true,
		body: definePasswordSchema,
		responses: {
			204: { description: "Password defined successfully" },
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized", schema: errorResponseSchema },
			404: { description: "User not found", schema: errorResponseSchema },
			409: { description: "Conflict", schema: errorResponseSchema },
			422: { description: "Unprocessable Entity", schema: errorResponseSchema },
		},
	})
}
