import { InMemoryPasswordResetTokenStore } from "./in-memory-password-reset-token-store"

describe("InMemoryPasswordResetTokenStore", () => {
	let sut: InMemoryPasswordResetTokenStore

	beforeEach(() => {
		sut = new InMemoryPasswordResetTokenStore()
	})

	test("findUserIdByTokenHash retorna null para hash desconhecido", async () => {
		await expect(sut.findUserIdByTokenHash("hash-x")).resolves.toBeNull()
	})

	test("saveResetToken e findUserIdByTokenHash funcionam corretamente", async () => {
		await sut.saveResetToken("user-1", "hash-abc", 900)
		await expect(sut.findUserIdByTokenHash("hash-abc")).resolves.toBe("user-1")
	})

	test("saveUidMapping e findTokenHashByUserId funcionam corretamente", async () => {
		await sut.saveUidMapping("user-1", "hash-abc", 900)
		await expect(sut.findTokenHashByUserId("user-1")).resolves.toBe("hash-abc")
	})

	test("deleteResetToken remove o mapeamento hash → userId", async () => {
		await sut.saveResetToken("user-1", "hash-abc", 900)
		await sut.deleteResetToken("hash-abc")
		await expect(sut.findUserIdByTokenHash("hash-abc")).resolves.toBeNull()
	})

	test("deleteUidMapping remove o mapeamento userId → hash", async () => {
		await sut.saveUidMapping("user-1", "hash-abc", 900)
		await sut.deleteUidMapping("user-1")
		await expect(sut.findTokenHashByUserId("user-1")).resolves.toBeNull()
	})

	test("saveResetToken não afeta o mapeamento uid", async () => {
		await sut.saveResetToken("user-1", "hash-abc", 900)
		await expect(sut.findTokenHashByUserId("user-1")).resolves.toBeNull()
	})
})
