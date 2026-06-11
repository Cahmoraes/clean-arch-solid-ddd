import { UserDAOMemory } from "./user-dao-memory.js"

describe("UserDAOMemory soft delete filter", () => {
	let dao: UserDAOMemory

	beforeEach(() => {
		dao = new UserDAOMemory()
	})

	test("fetchAndCountUsers ignora usuários soft-deleted", async () => {
		dao.createFakeUser({ id: "active-1", status: "activated" })
		dao.createFakeUser({
			id: "deleted-1",
			deletedAt: "2026-01-01T00:00:00.000Z",
		})

		const result = await dao.fetchAndCountUsers({ page: 1, limit: 10 })

		expect(result.total).toBe(1)
		expect(result.usersData.map((u) => u.id)).toEqual(["active-1"])
	})

	test("countUserStats não contabiliza usuários soft-deleted", async () => {
		dao.createFakeUser({ id: "a", role: "MEMBER", status: "activated" })
		dao.createFakeUser({ id: "b", role: "ADMIN", status: "activated" })
		dao.createFakeUser({
			id: "c",
			role: "MEMBER",
			status: "activated",
			deletedAt: "2026-01-01T00:00:00.000Z",
		})

		const stats = await dao.countUserStats()

		expect(stats.total).toBe(2)
		expect(stats.members).toBe(1)
		expect(stats.admins).toBe(1)
		expect(stats.active).toBe(2)
		expect(stats.inactive).toBe(0)
	})
})
