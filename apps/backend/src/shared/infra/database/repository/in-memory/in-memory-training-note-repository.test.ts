import { InMemoryTrainingNoteRepository } from "@/shared/infra/database/repository/in-memory/in-memory-training-note-repository"
import { TrainingNote } from "@/training-notes/domain/entity/training-note"

describe("InMemoryTrainingNoteRepository", () => {
	test("INV-01 duplo save do mesmo autor+data vira DuplicateTrainingNoteError e persiste uma", async () => {
		const repo = new InMemoryTrainingNoteRepository()
		const note = TrainingNote.create({
			userId: "u1",
			data: "2026-10-16",
			texto: "Peito + tríceps 4x12",
		}).forceSuccess().value
		expect((await repo.save(note)).isSuccess()).toBe(true)
		const again = await repo.save(note)
		expect(again.isFailure()).toBe(true)
		expect(
			(await repo.listByUserIdAndRange("u1", "2026-10-01", "2026-10-31"))
				.length,
		).toBe(1)
	})
})
