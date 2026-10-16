import { InMemoryTrainingNoteRepository } from "@/shared/infra/database/repository/in-memory/in-memory-training-note-repository"
import { TrainingNoteNotFoundError } from "@/training-notes/domain/error/training-note-not-found-error"
import { CreateTrainingNoteUseCase } from "./create-training-note.usecase"
import { UpdateTrainingNoteUseCase } from "./update-training-note.usecase"

test("update edita o texto; inexistente vira TrainingNoteNotFoundError sem efeito", async () => {
	const repo = new InMemoryTrainingNoteRepository()
	const updateUseCase = new UpdateTrainingNoteUseCase(repo)
	const createUseCase = new CreateTrainingNoteUseCase(repo)
	const missing = await updateUseCase.execute({
		userId: "u1",
		data: "2026-10-17",
		texto: "novo",
	})
	expect(missing.forceFailure().value).toBeInstanceOf(TrainingNoteNotFoundError)
	await createUseCase.execute({
		userId: "u1",
		data: "2026-10-17",
		texto: "inicial",
	})
	const ok = await updateUseCase.execute({
		userId: "u1",
		data: "2026-10-17",
		texto: "  Costas 5x5  ",
	})
	expect(ok.forceSuccess().value.texto).toBe("Costas 5x5")
})
