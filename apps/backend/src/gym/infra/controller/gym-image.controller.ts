import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { SetGymImageUseCase } from "@/gym/application/use-case/set-gym-image.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const UNSUPPORTED_MEDIA_TYPE = 415
const PAYLOAD_TOO_LARGE = 413

const gymImageParamsSchema = z.object({
	gymId: z.string().min(1).meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class GymImageController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.SetGymImage)
		private readonly setGymImageUseCase: SetGymImageUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"post",
			GymRoutes.UPLOAD_IMAGE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeGymImageSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			gymImageParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const data = await req.file()
		if (!data) {
			return ResponseFactory.BAD_REQUEST({ message: "No image file provided" })
		}
		if (!data.mimetype.startsWith("image/")) {
			return ResponseFactory.create({
				status: UNSUPPORTED_MEDIA_TYPE,
				message: "Unsupported media type",
			})
		}

		let fileBuffer: Buffer
		try {
			fileBuffer = await data.toBuffer()
		} catch {
			return ResponseFactory.create({
				status: PAYLOAD_TOO_LARGE,
				message: "File too large",
			})
		}

		const result = await this.setGymImageUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
			fileBuffer,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: {
				imageKey: result.value.imageKey,
				url: `/uploads/${result.value.imageKey}`,
			},
		})
	}
}

function makeGymImageSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Upload/replace a gym image",
		description:
			"Uploads a gym image (multipart/form-data, field 'image'). Requires ADMIN role",
		security: true,
		params: gymImageParamsSchema,
		responses: {
			200: {
				description: "Image stored",
				schema: z.object({
					imageKey: z.string().meta({ example: "gyms/abc.webp" }),
					url: z.string().meta({ example: "/uploads/gyms/abc.webp" }),
				}),
			},
			404: {
				description: "Gym not found",
				schema: z.object({ message: z.string() }),
			},
			413: {
				description: "File too large",
				schema: z.object({ message: z.string() }),
			},
			415: {
				description: "Unsupported media type",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
