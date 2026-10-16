import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SHARED_TYPES, TRAINING_NOTE_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import type { CreateTrainingNoteUseCase } from "@/training-notes/application/use-case/create-training-note.usecase.js"
import { DuplicateTrainingNoteError } from "@/training-notes/domain/error/duplicate-training-note-error.js"
import { InvalidTrainingNoteDateError } from "@/training-notes/domain/error/invalid-training-note-date-error.js"
import { InvalidTrainingNoteTextError } from "@/training-notes/domain/error/invalid-training-note-text-error.js"
import { TrainingNoteRoutes } from "./routes/training-note-routes.js"

const TRAINING_NOTE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_TRAINING_NOTE_YEAR = 1900
const MAX_TRAINING_NOTE_YEAR = 2199

function parseDateParts(value: string): {
	year: number
	month: number
	day: number
} | null {
	const match = TRAINING_NOTE_DATE_PATTERN.exec(value)
	if (!match) return null
	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
	}
}

function isRealCalendarDay(year: number, month: number, day: number): boolean {
	const utc = new Date(Date.UTC(year, month - 1, day))
	return (
		utc.getUTCFullYear() === year &&
		utc.getUTCMonth() === month - 1 &&
		utc.getUTCDate() === day
	)
}

function isValidTrainingNoteDate(value: string): boolean {
	const parts = parseDateParts(value)
	if (!parts) return false
	if (
		parts.year < MIN_TRAINING_NOTE_YEAR ||
		parts.year > MAX_TRAINING_NOTE_YEAR
	) {
		return false
	}
	if (parts.month < 1 || parts.month > 12) return false
	return isRealCalendarDay(parts.year, parts.month, parts.day)
}

const trainingNoteDateSchema = z
	.string()
	.regex(TRAINING_NOTE_DATE_PATTERN, "Data da nota deve ser YYYY-MM-DD")
	.refine(isValidTrainingNoteDate, {
		message: "Data da nota deve ser um dia válido entre 1900 e 2199",
	})
	.meta({
		description: "Dia de calendário em America/Sao_Paulo",
		example: "2026-10-16",
	})

const createTrainingNoteBodySchema = z.object({
	data: trainingNoteDateSchema,
	texto: z
		.string()
		.trim()
		.min(1, "Texto da nota deve ter entre 1 e 500 caracteres")
		.max(500, "Texto da nota deve ter entre 1 e 500 caracteres")
		.meta({ description: "Texto do treino", example: "Peito + tríceps 4x12" }),
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class CreateTrainingNoteController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(TRAINING_NOTE_TYPES.UseCases.CreateTrainingNote)
		private readonly createTrainingNote: CreateTrainingNoteUseCase,
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
		this.httpServer.register(
			"post",
			TrainingNoteRoutes.CREATE,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeCreateSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (error instanceof DuplicateTrainingNoteError) {
			return ResponseFactory.CONFLICT({
				message: "Esse dia já tem nota — edite a atual",
			})
		}
		if (
			error instanceof InvalidTrainingNoteDateError ||
			error instanceof InvalidTrainingNoteTextError
		) {
			return ResponseFactory.BAD_REQUEST({ message: error.message })
		}
		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parsedBody = this.parseRequest(createTrainingNoteBodySchema, req.body)
		if (parsedBody.isFailure()) {
			return this.createResponseError(parsedBody)
		}
		const result = await this.createTrainingNote.execute({
			userId: req.user.sub.id,
			data: parsedBody.value.data,
			texto: parsedBody.value.texto,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.CREATED,
			body: result.value,
		})
	}
}

export function makeCreateSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["training-notes"],
		summary: "Create a training note",
		description:
			"Creates one training note for a calendar day of the authenticated user.",
		security: true,
		body: createTrainingNoteBodySchema,
		responses: {
			201: {
				description: "Training note created successfully",
				schema: z.object({
					id: z.string().meta({ description: "Training note ID" }),
					data: trainingNoteDateSchema,
					texto: z.string().meta({ description: "Training note text" }),
					atualizadoEm: z.iso
						.datetime()
						.meta({ description: "Last update instant (ISO-8601 UTC)" }),
				}),
			},
			400: {
				description: "Invalid request body",
				schema: errorResponseSchema,
			},
			401: { description: "Unauthorized" },
			409: {
				description: "Conflict - day already has a note",
				schema: errorResponseSchema,
			},
		},
	})
}
