import { InMemoryTrainingNoteRepository } from "@/shared/infra/database/repository/in-memory/in-memory-training-note-repository"
import { CreateTrainingNoteUseCase } from "./create-training-note.usecase"
import { ListTrainingNotesUseCase } from "./list-training-notes.usecase"

test("list valida intervalo e devolve só o autor em ordem crescente", async () => {
	const repo = new InMemoryTrainingNoteRepository()
	const listUseCase = new ListTrainingNotesUseCase(repo)
	const createUseCase = new CreateTrainingNoteUseCase(repo)
	for (const input of [
		{ userId: "u1", de: "", ate: "2026-10-31" },
		{ userId: "u1", de: "2026-10-31", ate: "2026-10-01" },
		{ userId: "u1", de: "2026-01-01", ate: "2026-12-31" },
	]) {
		expect((await listUseCase.execute(input)).isFailure()).toBe(true)
	}
	await createUseCase.execute({ userId: "u1", data: "2026-10-20", texto: "a" })
	await createUseCase.execute({ userId: "u1", data: "2026-10-16", texto: "b" })
	await createUseCase.execute({ userId: "u2", data: "2026-10-18", texto: "c" })
	const rows = (
		await listUseCase.execute({
			userId: "u1",
			de: "2026-10-01",
			ate: "2026-10-31",
		})
	).forceSuccess().value
	expect(rows.map((r) => r.data)).toEqual(["2026-10-16", "2026-10-20"])
})
