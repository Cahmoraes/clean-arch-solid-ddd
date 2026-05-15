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
import type { CreatePasswordReauthGrantUseCase } from "@/user/application/use-case/create-password-reauth-grant.usecase"
import { UserRoutes } from "./routes/user-routes"

const createPasswordReauthGrantSchema = z.object({
	provider: z.enum(["google"]).meta({
		description: "External provider linked to the account",
		example: "google",
	}),
	idToken: z.string().min(1).meta({
		description: "Fresh provider id token used for recent reauthentication",
		example: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
	}),
})

const createPasswordReauthGrantResponseSchema = z.object({
	reauthGrant: z.string().meta({
		description: "Single-use reauthentication grant",
		example: "1cb3a5d4-b6ec-4c15-b8d5-b76740626d03",
	}),
	expiresInSeconds: z.number().meta({
		description: "Grant expiration time in seconds",
		example: 300,
	}),
})

const errorResponseSchema = z.object({
	code: z.string().optional().meta({ description: "Error code" }),
	message: z.string().meta({ description: "Error message" }),
})

export class CreatePasswordReauthGrantController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(USER_TYPES.UseCases.CreatePasswordReauthGrant)
		private readonly createPasswordReauthGrant: CreatePasswordReauthGrantUseCase,
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
			UserRoutes.PASSWORD_REAUTH,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeCreatePasswordReauthGrantSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		return this.mapKnownError(error)
	}

	private mapKnownError(error: Error): HandleCallbackResponse | undefined {
		if (error.name === "InvalidGoogleTokenError") {
			return ResponseFactory.UNAUTHORIZED({
				message: "Invalid Google token",
			})
		}

		if (error.name === "GoogleEmailNotVerifiedError") {
			return ResponseFactory.UNPROCESSABLE_ENTITY({
				code: "google_email_not_verified",
				message: "Google email is not verified",
			})
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

		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(
			createPasswordReauthGrantSchema,
			req.body,
		)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.createPasswordReauthGrant.execute({
			userId: req.user.sub.id,
			provider: parsedBodyOrError.value.provider,
			idToken: parsedBodyOrError.value.idToken,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.OK({
			body: result.value,
		})
	}
}

function makeCreatePasswordReauthGrantSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["users"],
		summary: "Create password reauthentication grant",
		description:
			"Validate a recent external provider reauthentication and return a single-use grant for first password setup.",
		security: true,
		body: createPasswordReauthGrantSchema,
		responses: {
			200: {
				description: "Reauthentication grant created successfully",
				schema: createPasswordReauthGrantResponseSchema,
			},
			400: { description: "Bad Request", schema: errorResponseSchema },
			401: { description: "Unauthorized", schema: errorResponseSchema },
			404: { description: "User not found", schema: errorResponseSchema },
			409: { description: "Conflict", schema: errorResponseSchema },
			422: { description: "Unprocessable Entity", schema: errorResponseSchema },
		},
	})
}
