import { InMemoryTrainingNoteRepository } from "@/shared/infra/database/repository/in-memory/in-memory-training-note-repository"
import { DuplicateTrainingNoteError } from "@/training-notes/domain/error/duplicate-training-note-error"
import { CreateTrainingNoteUseCase } from "./create-training-note.usecase"

test("create persiste e devolve atualizadoEm; duplicata vira DuplicateTrainingNoteError", async () => {
	const repo = new InMemoryTrainingNoteRepository()
	const createUseCase = new CreateTrainingNoteUseCase(repo)
	const ok = await createUseCase.execute({
		userId: "u1",
		data: "2026-10-16",
		texto: "Peito + tríceps 4x12",
	})
	expect(ok.forceSuccess().value.data).toBe("2026-10-16")
	const dupe = await createUseCase.execute({
		userId: "u1",
		data: "2026-10-16",
		texto: "outro",
	})
	expect(dupe.forceFailure().value).toBeInstanceOf(DuplicateTrainingNoteError)
	const other = await createUseCase.execute({
		userId: "u2",
		data: "2026-10-16",
		texto: "outro",
	})
	expect(other.isSuccess()).toBe(true)
})
