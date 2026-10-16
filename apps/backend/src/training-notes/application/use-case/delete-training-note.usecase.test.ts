import { InMemoryTrainingNoteRepository } from "@/shared/infra/database/repository/in-memory/in-memory-training-note-repository"
import { TrainingNoteNotFoundError } from "@/training-notes/domain/error/training-note-not-found-error"
import { CreateTrainingNoteUseCase } from "./create-training-note.usecase"
import { DeleteTrainingNoteUseCase } from "./delete-training-note.usecase"

test("delete remove; inexistente vira TrainingNoteNotFoundError", async () => {
	const repo = new InMemoryTrainingNoteRepository()
	const deleteUseCase = new DeleteTrainingNoteUseCase(repo)
	const createUseCase = new CreateTrainingNoteUseCase(repo)
	const missing = await deleteUseCase.execute({
		userId: "u1",
		data: "2026-10-18",
	})
	expect(missing.forceFailure().value).toBeInstanceOf(TrainingNoteNotFoundError)
	await createUseCase.execute({
		userId: "u1",
		data: "2026-10-18",
		texto: "inicial",
	})
	expect(
		(
			await deleteUseCase.execute({ userId: "u1", data: "2026-10-18" })
		).isSuccess(),
	).toBe(true)
	expect(await repo.findByUserIdAndDate("u1", "2026-10-18")).toBeNull()
})
