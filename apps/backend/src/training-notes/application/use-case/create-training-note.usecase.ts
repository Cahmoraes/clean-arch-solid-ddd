import { injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import type { TrainingNotesRepository } from "@/training-notes/application/repository/training-note-repository.js"
import { TrainingNote } from "@/training-notes/domain/entity/training-note.js"
import { DuplicateTrainingNoteError } from "@/training-notes/domain/error/duplicate-training-note-error.js"

export interface CreateTrainingNoteUseCaseInput {
	userId: string
	data: string
	texto: string
}

export interface CreateTrainingNoteUseCaseOutput {
	id: string
	data: string
	texto: string
	atualizadoEm: string
}

export type CreateTrainingNoteUseCaseResponse = Either<
	Error,
	CreateTrainingNoteUseCaseOutput
>

@injectable()
export class CreateTrainingNoteUseCase {
	constructor(
		private readonly trainingNotesRepository: TrainingNotesRepository,
	) {}

	public async execute(
		input: CreateTrainingNoteUseCaseInput,
	): Promise<CreateTrainingNoteUseCaseResponse> {
		const createdOrError = TrainingNote.create({
			userId: input.userId,
			data: input.data,
			texto: input.texto,
		})
		if (createdOrError.isFailure()) return failure(createdOrError.value)
		const existing = await this.trainingNotesRepository.findByUserIdAndDate(
			input.userId,
			input.data,
		)
		if (existing) return failure(new DuplicateTrainingNoteError())
		const note = createdOrError.forceSuccess().value
		const savedOrError = await this.trainingNotesRepository.save(note)
		if (savedOrError.isFailure()) return failure(savedOrError.value)
		return success({
			id: note.id,
			data: note.data,
			texto: note.texto,
			atualizadoEm: note.updatedAt.toISOString(),
		})
	}
}
