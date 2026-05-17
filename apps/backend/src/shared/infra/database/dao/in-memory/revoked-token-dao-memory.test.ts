import { RevokedTokenDAOMemory } from "./revoked-token-dao-memory"

describe("RevokedTokenDAOMemory – revokeAllForUser / isAllRevokedForUser", () => {
	let sut: RevokedTokenDAOMemory

	beforeEach(() => {
		sut = new RevokedTokenDAOMemory()
	})

	test("isAllRevokedForUser retorna false para usuário não revogado", async () => {
		await expect(sut.isAllRevokedForUser("user-1")).resolves.toBe(false)
	})

	test("revokeAllForUser marca o usuário como revogado", async () => {
		await sut.revokeAllForUser("user-1", 900)
		await expect(sut.isAllRevokedForUser("user-1")).resolves.toBe(true)
	})

	test("não afeta outros usuários", async () => {
		await sut.revokeAllForUser("user-1", 900)
		await expect(sut.isAllRevokedForUser("user-2")).resolves.toBe(false)
	})
})
