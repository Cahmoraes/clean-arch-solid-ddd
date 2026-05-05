import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { ZodError, z } from "zod"
import type { CreateGymUseCase } from "@/gym/application/use-case/create-gym.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server"
import { GymRoutes } from "./routes/gym-routes"

const createGymSchema = z.object({
	cnpj: z.string().meta({ description: "Gym CNPJ", example: "12345678000100" }),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
	description: z
		.string()
		.optional()
		.meta({ description: "Gym description", example: "A great gym" }),
	phone: z
		.string()
		.optional()
		.meta({ description: "Gym phone number", example: "11999999999" }),
	latitude: z.number().meta({ description: "Gym latitude", example: -23.5505 }),
	longitude: z
		.number()
		.meta({ description: "Gym longitude", example: -46.6333 }),
	address: z
		.string()
		.meta({ description: "Gym address", example: "Rua Test, 123" }),
})

export type CreateGymPayload = z.infer<typeof createGymSchema>

export class CreateGymController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.CreateGym)
		private readonly createGymUseCase: CreateGymUseCase,
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
	public async init(): Promise<void> {
		this.server.register(
			"post",
			GymRoutes.CREATE,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeCreateGymSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}

		return ResponseFactory.CONFLICT({
			message: error.message,
		})
	}

	private async callback(req: FastifyRequest) {
		const parsedBodyOrError = this.parseRequest(createGymSchema, req.body)
		if (parsedBodyOrError.isFailure()) {
			return this.createResponseError(parsedBodyOrError)
		}

		const result = await this.createGymUseCase.execute(parsedBodyOrError.value)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.CREATED({
			body: {
				message: "Gym created",
				id: result.value.gymId,
			},
		})
	}
}

function makeCreateGymSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Create a new gym",
		description:
			"Create a new gym with location coordinates. Requires ADMIN role",
		security: true,
		body: createGymSchema,
		responses: {
			201: {
				description: "Gym created successfully",
				schema: z.object({
					message: z
						.string()
						.meta({ description: "Success message", example: "Gym created" }),
					id: z.string().meta({
						description: "Created gym ID",
						example: "550e8400-e29b-41d4-a716-446655440000",
					}),
				}),
			},
			400: {
				description: "Invalid request body",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			409: {
				description: "Conflict - Gym already exists",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
