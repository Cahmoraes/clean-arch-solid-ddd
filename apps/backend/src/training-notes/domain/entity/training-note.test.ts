import { DuplicateTrainingNoteError } from "../error/duplicate-training-note-error"
import { TrainingNoteNotFoundError } from "../error/training-note-not-found-error"
import { TrainingNote } from "./training-note"

describe("TrainingNote", () => {
	test("INV-02 texto com 500 caracteres é aceito e com 501 é recusado", () => {
		const ok = TrainingNote.create({
			userId: "u1",
			data: "2026-10-16",
			texto: "a".repeat(500),
		})
		expect(ok.isSuccess()).toBe(true)
		const tooLong = TrainingNote.create({
			userId: "u1",
			data: "2026-10-16",
			texto: "a".repeat(501),
		})
		expect(tooLong.isFailure()).toBe(true)
		const empty = TrainingNote.create({
			userId: "u1",
			data: "2026-10-16",
			texto: "   ",
		})
		expect(empty.isFailure()).toBe(true)
		expect(empty.forceFailure().value.kind).toBe("validation")
	})

	test("data inválida é recusada e restore não valida", () => {
		for (const data of [
			"2026-02-30",
			"16-10-2026",
			"1899-12-31",
			"2200-01-01",
		]) {
			expect(
				TrainingNote.create({
					userId: "u1",
					data,
					texto: "treino",
				}).isFailure(),
			).toBe(true)
		}
		const restored = TrainingNote.restore({
			id: "id1",
			userId: "u1",
			data: "2026-10-16",
			texto: "  Peito + tríceps 4x12  ",
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		expect(restored.texto).toBe("Peito + tríceps 4x12")
	})

	test("erros de conflito e ausência carregam o kind correto", () => {
		expect(new DuplicateTrainingNoteError().kind).toBe("conflict")
		expect(new TrainingNoteNotFoundError().kind).toBe("not-found")
	})
})
