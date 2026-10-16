import { injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import type { TrainingNotesRepository } from "@/training-notes/application/repository/training-note-repository.js"
import { TrainingNote } from "@/training-notes/domain/entity/training-note.js"
import { TrainingNoteNotFoundError } from "@/training-notes/domain/error/training-note-not-found-error.js"

export interface UpdateTrainingNoteUseCaseInput {
	userId: string
	data: string
	texto: string
}

export interface UpdateTrainingNoteUseCaseOutput {
	id: string
	data: string
	texto: string
	atualizadoEm: string
}

export type UpdateTrainingNoteUseCaseResponse = Either<
	Error,
	UpdateTrainingNoteUseCaseOutput
>

@injectable()
export class UpdateTrainingNoteUseCase {
	constructor(
		private readonly trainingNotesRepository: TrainingNotesRepository,
	) {}

	public async execute(
		input: UpdateTrainingNoteUseCaseInput,
	): Promise<UpdateTrainingNoteUseCaseResponse> {
		const existing = await this.trainingNotesRepository.findByUserIdAndDate(
			input.userId,
			input.data,
		)
		if (!existing) return failure(new TrainingNoteNotFoundError())
		const validatedOrError = TrainingNote.create({
			userId: input.userId,
			data: input.data,
			texto: input.texto,
		})
		if (validatedOrError.isFailure()) return failure(validatedOrError.value)
		const validatedTexto = validatedOrError.forceSuccess().value.texto
		// yagni: save é insert-only (UNIQUE autor+data); delete-then-save preserva
		// id/createdAt via restore até existir update dedicado no repositório.
		await this.trainingNotesRepository.deleteByUserIdAndDate(
			input.userId,
			input.data,
		)
		const updated = TrainingNote.restore({
			id: existing.id,
			userId: input.userId,
			data: input.data,
			texto: validatedTexto,
			createdAt: existing.createdAt,
			updatedAt: new Date(),
		})
		const savedOrError = await this.trainingNotesRepository.save(updated)
		if (savedOrError.isFailure()) return failure(savedOrError.value)
		return success({
			id: updated.id,
			data: updated.data,
			texto: updated.texto,
			atualizadoEm: updated.updatedAt.toISOString(),
		})
	}
}
