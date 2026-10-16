import { injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import type { TrainingNotesRepository } from "@/training-notes/application/repository/training-note-repository.js"
import { InvalidTrainingNoteDateError } from "@/training-notes/domain/error/invalid-training-note-date-error.js"

export interface ListTrainingNotesUseCaseInput {
	userId: string
	de: string
	ate: string
}

export interface ListTrainingNotesUseCaseItem {
	data: string
	texto: string
	atualizadoEm: string
}

export type ListTrainingNotesUseCaseResponse = Either<
	Error,
	ListTrainingNotesUseCaseItem[]
>

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_YEAR = 1900
const MAX_YEAR = 2199
const MAX_RANGE_IN_DAYS = 62
const MS_PER_DAY = 24 * 60 * 60 * 1000

function parseDateParts(value: string): {
	year: number
	month: number
	day: number
} | null {
	const match = DATE_PATTERN.exec(value)
	if (!match) return null
	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3]),
	}
}

function isRealCalendarDay(year: number, month: number, day: number): boolean {
	if (month < 1 || month > 12) return false
	const utc = new Date(Date.UTC(year, month - 1, day))
	return (
		utc.getUTCFullYear() === year &&
		utc.getUTCMonth() === month - 1 &&
		utc.getUTCDate() === day
	)
}

function isValidRangeDate(value: string): boolean {
	if (!value) return false
	const parts = parseDateParts(value)
	if (!parts) return false
	if (parts.year < MIN_YEAR || parts.year > MAX_YEAR) return false
	return isRealCalendarDay(parts.year, parts.month, parts.day)
}

function toUtcTime(value: string): number {
	const parts = parseDateParts(value)
	if (!parts) return Number.NaN
	return Date.UTC(parts.year, parts.month - 1, parts.day)
}

@injectable()
export class ListTrainingNotesUseCase {
	constructor(
		private readonly trainingNotesRepository: TrainingNotesRepository,
	) {}

	public async execute(
		input: ListTrainingNotesUseCaseInput,
	): Promise<ListTrainingNotesUseCaseResponse> {
		if (!isValidRangeDate(input.de) || !isValidRangeDate(input.ate)) {
			return failure(new InvalidTrainingNoteDateError())
		}
		if (input.de > input.ate) return failure(new InvalidTrainingNoteDateError())
		const rangeInDays =
			(toUtcTime(input.ate) - toUtcTime(input.de)) / MS_PER_DAY
		if (rangeInDays > MAX_RANGE_IN_DAYS) {
			return failure(new InvalidTrainingNoteDateError())
		}
		const notes = await this.trainingNotesRepository.listByUserIdAndRange(
			input.userId,
			input.de,
			input.ate,
		)
		return success(
			notes
				.slice()
				.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
				.map((note) => ({
					data: note.data,
					texto: note.texto,
					atualizadoEm: note.updatedAt.toISOString(),
				})),
		)
	}
}
