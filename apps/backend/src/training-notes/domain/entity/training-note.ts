import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import { Id } from "@/shared/domain/value-object/id.js"
import { InvalidTrainingNoteDateError } from "../error/invalid-training-note-date-error.js"
import { InvalidTrainingNoteTextError } from "../error/invalid-training-note-text-error.js"

export type TrainingNoteCreateInput = {
	id?: string
	userId: string
	data: string
	texto: string
}

export type TrainingNoteRestoreInput = {
	id: string
	userId: string
	data: string
	texto: string
	createdAt: Date
	updatedAt: Date
}

interface TrainingNoteProps {
	id: Id
	userId: string
	data: string
	texto: string
	createdAt: Date
	updatedAt: Date
}

export const MAX_TRAINING_NOTE_TEXT_LENGTH = 500

const TRAINING_NOTE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_TRAINING_NOTE_YEAR = 1900
const MAX_TRAINING_NOTE_YEAR = 2199

export class TrainingNote {
	private readonly _id: Id
	private readonly _userId: string
	private readonly _data: string
	private readonly _texto: string
	private readonly _createdAt: Date
	private readonly _updatedAt: Date

	private constructor(props: TrainingNoteProps) {
		this._id = props.id
		this._userId = props.userId
		this._data = props.data
		this._texto = props.texto
		this._createdAt = props.createdAt
		this._updatedAt = props.updatedAt
	}

	public static create(
		input: TrainingNoteCreateInput,
	): Either<
		InvalidTrainingNoteTextError | InvalidTrainingNoteDateError,
		TrainingNote
	> {
		const texto = input.texto.trim()
		if (texto.length < 1 || texto.length > MAX_TRAINING_NOTE_TEXT_LENGTH) {
			return failure(new InvalidTrainingNoteTextError())
		}
		if (!TrainingNote.isValidDate(input.data)) {
			return failure(new InvalidTrainingNoteDateError())
		}
		const now = new Date()
		return success(
			new TrainingNote({
				id: Id.create(input.id),
				userId: input.userId,
				data: input.data,
				texto,
				createdAt: now,
				updatedAt: now,
			}),
		)
	}

	public static restore(input: TrainingNoteRestoreInput): TrainingNote {
		return new TrainingNote({
			id: Id.restore(input.id),
			userId: input.userId,
			data: input.data,
			texto: input.texto.trim(),
			createdAt: input.createdAt,
			updatedAt: input.updatedAt,
		})
	}

	private static isValidDate(data: string): boolean {
		const match = TRAINING_NOTE_DATE_PATTERN.exec(data)
		if (!match) return false
		const year = Number(match[1])
		const month = Number(match[2])
		const day = Number(match[3])
		if (year < MIN_TRAINING_NOTE_YEAR || year > MAX_TRAINING_NOTE_YEAR) {
			return false
		}
		if (month < 1 || month > 12) return false
		return TrainingNote.isRealCalendarDay(year, month, day)
	}

	private static isRealCalendarDay(
		year: number,
		month: number,
		day: number,
	): boolean {
		const utc = new Date(Date.UTC(year, month - 1, day))
		return (
			utc.getUTCFullYear() === year &&
			utc.getUTCMonth() === month - 1 &&
			utc.getUTCDate() === day
		)
	}

	get id(): string {
		return this._id.value
	}

	get userId(): string {
		return this._userId
	}

	get data(): string {
		return this._data
	}

	get texto(): string {
		return this._texto
	}

	get createdAt(): Date {
		return this._createdAt
	}

	get updatedAt(): Date {
		return this._updatedAt
	}
}
