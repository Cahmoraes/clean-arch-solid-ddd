import { injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either.js"
import type { TrainingNotesRepository } from "@/training-notes/application/repository/training-note-repository.js"
import { TrainingNoteNotFoundError } from "@/training-notes/domain/error/training-note-not-found-error.js"

export interface DeleteTrainingNoteUseCaseInput {
	userId: string
	data: string
}

export type DeleteTrainingNoteUseCaseResponse = Either<Error, void>

@injectable()
export class DeleteTrainingNoteUseCase {
	constructor(
		private readonly trainingNotesRepository: TrainingNotesRepository,
	) {}

	public async execute(
		input: DeleteTrainingNoteUseCaseInput,
	): Promise<DeleteTrainingNoteUseCaseResponse> {
		const existing = await this.trainingNotesRepository.findByUserIdAndDate(
			input.userId,
			input.data,
		)
		if (!existing) return failure(new TrainingNoteNotFoundError())
		await this.trainingNotesRepository.deleteByUserIdAndDate(
			input.userId,
			input.data,
		)
		return success(undefined)
	}
}
