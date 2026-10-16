import type { Either } from "@/shared/domain/value-object/either"
import type { TrainingNote } from "@/training-notes/domain/entity/training-note"
import type { DuplicateTrainingNoteError } from "@/training-notes/domain/error/duplicate-training-note-error"

export interface TrainingNotesRepository {
	save(note: TrainingNote): Promise<Either<DuplicateTrainingNoteError, void>>
	findByUserIdAndDate(
		userId: string,
		data: string,
	): Promise<TrainingNote | null>
	listByUserIdAndRange(
		userId: string,
		de: string,
		ate: string,
	): Promise<TrainingNote[]>
	deleteByUserIdAndDate(userId: string, data: string): Promise<void>
	withTransaction<TX extends object>(object: TX): TrainingNotesRepository
}
