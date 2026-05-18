import { RevokedTokenDAOMemory } from "./revoked-token-dao-memory"

describe("RevokedTokenDAOMemory – revokeAllForUser / revokedAfterForUser", () => {
	let sut: RevokedTokenDAOMemory

	beforeEach(() => {
		sut = new RevokedTokenDAOMemory()
	})

	test("revokedAfterForUser retorna null para usuário não revogado", async () => {
		await expect(sut.revokedAfterForUser("user-1")).resolves.toBeNull()
	})

	test("revokeAllForUser armazena timestamp de revogação", async () => {
		const before = Math.floor(Date.now() / 1000)
		await sut.revokeAllForUser("user-1", 900)
		const after = Math.floor(Date.now() / 1000)

		const revokedAt = await sut.revokedAfterForUser("user-1")
		expect(revokedAt).not.toBeNull()
		expect(revokedAt).toBeGreaterThanOrEqual(before)
		expect(revokedAt).toBeLessThanOrEqual(after)
	})

	test("não afeta outros usuários", async () => {
		await sut.revokeAllForUser("user-1", 900)
		await expect(sut.revokedAfterForUser("user-2")).resolves.toBeNull()
	})

	test("token emitido antes da revogação é considerado inválido", async () => {
		const tokenIat = Math.floor(Date.now() / 1000) - 10
		await sut.revokeAllForUser("user-1", 900)
		const revokedAt = await sut.revokedAfterForUser("user-1")
		expect(revokedAt).not.toBeNull()
		if (revokedAt === null) throw new Error("revokedAt should not be null")
		expect(tokenIat <= revokedAt).toBe(true)
	})
})
