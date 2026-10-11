import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { UserDAO } from "@/user/application/persistence/dao/user-dao"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface DaoSeedUser {
	id: string
	name: string
	email: string
	role: RoleTypes
	status: StatusTypes
	createdAt: Date
	isSuperAdmin: boolean
	deletedAt: Date | null
}

export interface UserDaoContractContext {
	dao: UserDAO
	seed(users: DaoSeedUser[]): Promise<void>
	newId(): string
	cleanup(): Promise<void>
}

export function describeUserDaoContract(
	name: string,
	factory: () => Promise<UserDaoContractContext>,
): void {
	describe(`UserDAO contract (${name})`, () => {
		let context: UserDaoContractContext
		let token: string
		let alice: DaoSeedUser
		let bob: DaoSeedUser
		let carol: DaoSeedUser
		let dave: DaoSeedUser

		function seedUser(
			label: string,
			overrides: Partial<DaoSeedUser>,
		): DaoSeedUser {
			const id = context.newId()
			return {
				id,
				name: `${token} ${label}`,
				email: `${label.toLowerCase()}-${token}@dao.test`,
				role: "MEMBER",
				status: "activated",
				createdAt: new Date("2026-03-01T10:00:00.000Z"),
				isSuperAdmin: false,
				deletedAt: null,
				...overrides,
			}
		}

		beforeEach(async () => {
			context = await factory()
			token = context.newId().slice(0, 8)
			alice = seedUser("Alice", {
				role: "ADMIN",
				createdAt: new Date("2026-03-01T10:00:00.000Z"),
			})
			bob = seedUser("Bob", {
				createdAt: new Date("2026-03-02T10:00:00.000Z"),
			})
			carol = seedUser("Carol", {
				status: "suspended",
				createdAt: new Date("2026-03-03T10:00:00.000Z"),
			})
			dave = seedUser("Dave", {
				deletedAt: new Date("2026-04-01T00:00:00.000Z"),
			})
		})

		afterEach(async () => {
			await context.cleanup()
		})

		it("filters by a case-insensitive text query on name and e-mail, excluding deleted users", async () => {
			await context.seed([alice, bob, carol, dave])

			const output = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token.toUpperCase(),
			})

			expect(output.total).toBe(3)
			expect(output.usersData.map((user) => user.id).sort()).toEqual(
				[alice.id, bob.id, carol.id].sort(),
			)
		})

		it("filters by role", async () => {
			await context.seed([alice, bob, carol])

			const output = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token,
				role: "ADMIN",
			})

			expect(output.usersData.map((user) => user.id)).toEqual([alice.id])
			expect(output.total).toBe(1)
		})

		it("maps status active to activated and inactive to suspended", async () => {
			await context.seed([alice, bob, carol])

			const active = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token,
				status: "active",
			})
			const inactive = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token,
				status: "inactive",
			})

			expect(active.usersData.map((user) => user.id).sort()).toEqual(
				[alice.id, bob.id].sort(),
			)
			expect(inactive.usersData.map((user) => user.id)).toEqual([carol.id])
		})

		it("FR-012: paginates with limit and page and reports the total of the whole filter", async () => {
			await context.seed([alice, bob, carol])

			const firstPage = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 2,
				query: token,
			})
			const secondPage = await context.dao.fetchAndCountUsers({
				page: 2,
				limit: 2,
				query: token,
			})

			expect(firstPage.usersData).toHaveLength(2)
			expect(secondPage.usersData).toHaveLength(1)
			expect(firstPage.total).toBe(3)
			expect(secondPage.total).toBe(3)
			const returnedIds = [...firstPage.usersData, ...secondPage.usersData]
				.map((user) => user.id)
				.sort()
			expect(returnedIds).toEqual([alice.id, bob.id, carol.id].sort())
		})

		it("returns the user fields the API needs", async () => {
			await context.seed([bob])

			const output = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token,
			})

			expect(output.usersData).toEqual([
				{
					id: bob.id,
					email: bob.email,
					name: bob.name,
					role: "MEMBER",
					status: "activated",
					isSuperAdmin: false,
					createdAt: "2026-03-02T10:00:00.000Z",
				},
			])
		})

		it("countUserStats counts the seeded users on top of the existing totals", async () => {
			const before = await context.dao.countUserStats()
			await context.seed([alice, bob, carol, dave])

			const after = await context.dao.countUserStats()

			expect(after.total - before.total).toBe(3)
			expect(after.members - before.members).toBe(2)
			expect(after.admins - before.admins).toBe(1)
			expect(after.active - before.active).toBe(2)
			expect(after.inactive - before.inactive).toBe(1)
		})
	})
}
