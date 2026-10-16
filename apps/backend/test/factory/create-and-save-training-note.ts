import type { InMemoryTrainingNoteRepository } from "@/shared/infra/database/repository/in-memory/in-memory-training-note-repository"
import { TrainingNote } from "@/training-notes/domain/entity/training-note"

export interface CreateAndSaveTrainingNoteProps {
	trainingNoteRepository: InMemoryTrainingNoteRepository
	userId?: string
	data?: string
	texto?: string
}

export async function createAndSaveTrainingNote(
	props: CreateAndSaveTrainingNoteProps,
) {
	const note = TrainingNote.create({
		userId: props.userId ?? "any_user_id",
		data: props.data ?? "2026-10-16",
		texto: props.texto ?? "treino",
	}).forceSuccess().value
	await props.trainingNoteRepository.save(note)
	return note
}
