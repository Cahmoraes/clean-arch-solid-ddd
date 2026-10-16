import type { FastifyRequest } from "fastify"
import { inject, injectable } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SHARED_TYPES, TRAINING_NOTE_TYPES } from "@/shared/infra/ioc/types.js"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server.js"
import type { DeleteTrainingNoteUseCase } from "@/training-notes/application/use-case/delete-training-note.usecase.js"
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

const deleteTrainingNoteParamsSchema = z.object({
	date: trainingNoteDateSchema,
})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class DeleteTrainingNoteController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(TRAINING_NOTE_TYPES.UseCases.DeleteTrainingNote)
		private readonly deleteTrainingNote: DeleteTrainingNoteUseCase,
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
			"delete",
			TrainingNoteRoutes.BY_DATE,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeDeleteSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParams = this.parseRequest(
			deleteTrainingNoteParamsSchema,
			req.params,
		)
		if (parsedParams.isFailure()) {
			return this.createResponseError(parsedParams)
		}
		const result = await this.deleteTrainingNote.execute({
			userId: req.user.sub.id,
			data: parsedParams.value.date,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.NO_CONTENT()
	}
}

export function makeDeleteSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["training-notes"],
		summary: "Delete a training note",
		description:
			"Deletes the training note of a calendar day of the authenticated user.",
		security: true,
		params: deleteTrainingNoteParamsSchema,
		responses: {
			204: { description: "Training note deleted successfully" },
			400: {
				description: "Invalid params",
				schema: errorResponseSchema,
			},
			401: { description: "Unauthorized" },
			404: {
				description: "Training note not found",
				schema: errorResponseSchema,
			},
		},
	})
}
