import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import type { TrainingNotesRepository } from "@/training-notes/application/repository/training-note-repository"
import type { TrainingNote } from "@/training-notes/domain/entity/training-note"
import { DuplicateTrainingNoteError } from "@/training-notes/domain/error/duplicate-training-note-error"

@injectable()
export class InMemoryTrainingNoteRepository implements TrainingNotesRepository {
	public notes = new ExtendedSet<TrainingNote>()

	public withTransaction(): TrainingNotesRepository {
		return this
	}

	public async save(
		note: TrainingNote,
	): Promise<Either<DuplicateTrainingNoteError, void>> {
		const duplicate = this.notes.some(
			(item) => item.userId === note.userId && item.data === note.data,
		)
		if (duplicate) return failure(new DuplicateTrainingNoteError())
		this.notes.add(note)
		return success(undefined)
	}

	public async findByUserIdAndDate(
		userId: string,
		data: string,
	): Promise<TrainingNote | null> {
		return (
			this.notes.find((note) => note.userId === userId && note.data === data) ??
			null
		)
	}

	public async listByUserIdAndRange(
		userId: string,
		de: string,
		ate: string,
	): Promise<TrainingNote[]> {
		return this.notes
			.toArray()
			.filter(
				(note) => note.userId === userId && note.data >= de && note.data <= ate,
			)
			.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
	}

	public async deleteByUserIdAndDate(
		userId: string,
		data: string,
	): Promise<void> {
		const existing = await this.findByUserIdAndDate(userId, data)
		if (existing) this.notes.delete(existing)
	}
}
