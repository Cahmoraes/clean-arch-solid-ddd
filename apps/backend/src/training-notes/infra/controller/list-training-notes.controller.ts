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
import type { ListTrainingNotesUseCase } from "@/training-notes/application/use-case/list-training-notes.usecase.js"
import { InvalidTrainingNoteDateError } from "@/training-notes/domain/error/invalid-training-note-date-error.js"
import { TrainingNoteRoutes } from "./routes/training-note-routes.js"

const TRAINING_NOTE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_TRAINING_NOTE_YEAR = 1900
const MAX_TRAINING_NOTE_YEAR = 2199
const MAX_RANGE_IN_DAYS = 62
const MS_PER_DAY = 24 * 60 * 60 * 1000

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

function toUtcTime(value: string): number {
	const parts = parseDateParts(value)
	if (!parts) return Number.NaN
	return Date.UTC(parts.year, parts.month - 1, parts.day)
}

const trainingNoteDateSchema = z
	.string()
	.regex(TRAINING_NOTE_DATE_PATTERN, "Data deve ser YYYY-MM-DD")
	.refine(isValidTrainingNoteDate, {
		message: "Data deve ser um dia válido entre 1900 e 2199",
	})

const listTrainingNotesQuerySchema = z
	.object({
		de: trainingNoteDateSchema.meta({
			description: "Primeiro dia do intervalo (inclusive)",
			example: "2026-10-01",
		}),
		ate: trainingNoteDateSchema.meta({
			description: "Último dia do intervalo (inclusive)",
			example: "2026-10-31",
		}),
	})
	.superRefine((value, ctx) => {
		if (value.de > value.ate) {
			ctx.addIssue({
				code: "custom",
				message: "`de` deve ser menor ou igual a `ate`",
				path: ["ate"],
			})
			return
		}
		const rangeInDays =
			(toUtcTime(value.ate) - toUtcTime(value.de)) / MS_PER_DAY
		if (rangeInDays > MAX_RANGE_IN_DAYS) {
			ctx.addIssue({
				code: "custom",
				message: "Intervalo deve ter até 62 dias",
				path: ["ate"],
			})
		}
	})

const errorResponseSchema = z.object({
	message: z.string().meta({ description: "Error message" }),
})

@injectable()
export class ListTrainingNotesController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly httpServer: HttpServer,
		@inject(TRAINING_NOTE_TYPES.UseCases.ListTrainingNotes)
		private readonly listTrainingNotes: ListTrainingNotesUseCase,
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
			"get",
			TrainingNoteRoutes.LIST,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeListSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (error instanceof InvalidTrainingNoteDateError) {
			return ResponseFactory.BAD_REQUEST({ message: error.message })
		}
		return undefined
	}

	private async callback(req: FastifyRequest) {
		const parsedQuery = this.parseRequest(
			listTrainingNotesQuerySchema,
			req.query,
		)
		if (parsedQuery.isFailure()) {
			return this.createResponseError(parsedQuery)
		}
		const result = await this.listTrainingNotes.execute({
			userId: req.user.sub.id,
			de: parsedQuery.value.de,
			ate: parsedQuery.value.ate,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result.value,
		})
	}
}

export function makeListSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["training-notes"],
		summary: "List training notes",
		description:
			"Lists training notes of the authenticated user in a date range, ascending.",
		security: true,
		querystring: listTrainingNotesQuerySchema,
		responses: {
			200: {
				description: "Training notes retrieved successfully",
				schema: z.array(
					z.object({
						data: trainingNoteDateSchema.meta({
							description: "Dia de calendário em America/Sao_Paulo",
						}),
						texto: z.string().meta({ description: "Training note text" }),
						atualizadoEm: z.iso
							.datetime()
							.meta({ description: "Last update instant (ISO-8601 UTC)" }),
					}),
				),
			},
			400: {
				description: "Invalid query params",
				schema: errorResponseSchema,
			},
			401: { description: "Unauthorized" },
		},
	})
}
