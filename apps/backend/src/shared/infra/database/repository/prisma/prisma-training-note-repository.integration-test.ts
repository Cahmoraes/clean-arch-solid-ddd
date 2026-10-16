import { randomUUID } from "node:crypto"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"
import { PrismaTrainingNoteRepository } from "@/shared/infra/database/repository/prisma/prisma-training-note-repository"
import { TrainingNote } from "@/training-notes/domain/entity/training-note"
import { DuplicateTrainingNoteError } from "@/training-notes/domain/error/duplicate-training-note-error"

async function createTestUser() {
	const userId = randomUUID()
	await prismaClient.user.create({
		data: {
			id: userId,
			name: "Test User",
			email: `test-${userId}@example.com`,
			password_hash: "hashed-password",
			role: "MEMBER",
			status: "activated",
		},
	})
	return userId
}

function nota(userId: string, data: string) {
	return TrainingNote.create({ userId, data, texto: "treino" }).forceSuccess()
		.value
}

describe("PrismaTrainingNoteRepository", () => {
	let repo: PrismaTrainingNoteRepository
	let userId: string

	beforeEach(async () => {
		repo = new PrismaTrainingNoteRepository(prismaClient)
		userId = await createTestUser()
	})

	afterEach(async () => {
		await prismaClient.trainingNote.deleteMany({ where: { userId } })
		await prismaClient.user.delete({ where: { id: userId } })
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	test("INV-01 P2002 do Prisma vira DuplicateTrainingNoteError", async () => {
		const first = await repo.save(nota(userId, "2026-10-16"))
		expect(first.isSuccess()).toBe(true)
		const second = await repo.save(nota(userId, "2026-10-16"))
		expect(second.forceFailure().value).toBeInstanceOf(
			DuplicateTrainingNoteError,
		)
	})

	test("AC-05 leitura é isolada por autor", async () => {
		await repo.save(nota(userId, "2026-10-16"))
		const otherUserId = await createTestUser()
		try {
			const alheias = await repo.listByUserIdAndRange(
				otherUserId,
				"2026-10-01",
				"2026-10-31",
			)
			expect(alheias).toEqual([])
			expect(
				await repo.findByUserIdAndDate(otherUserId, "2026-10-16"),
			).toBeNull()
		} finally {
			await prismaClient.trainingNote.deleteMany({
				where: { userId: otherUserId },
			})
			await prismaClient.user.delete({ where: { id: otherUserId } })
		}
	})

	test("INV-03 excluir remove e a listagem deixa de incluir a data", async () => {
		await repo.save(nota(userId, "2026-10-16"))
		await repo.deleteByUserIdAndDate(userId, "2026-10-16")
		expect(await repo.findByUserIdAndDate(userId, "2026-10-16")).toBeNull()
		expect(
			await repo.listByUserIdAndRange(userId, "2026-10-01", "2026-10-31"),
		).toEqual([])
	})
})
