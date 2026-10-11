import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { UserQuery } from "@/user/application/persistence/repository/user-query"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"

export interface UserRepositoryContractContext {
	repository: UserRepository
	newId(): string
	cleanup(): Promise<void>
}

type UserProps = Parameters<typeof User.restore>[0]

export function describeUserRepositoryContract(
	name: string,
	factory: () => Promise<UserRepositoryContractContext>,
): void {
	describe(`UserRepository contract (${name})`, () => {
		let context: UserRepositoryContractContext

		beforeEach(async () => {
			context = await factory()
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildUser(overrides: Partial<UserProps> = {}): User {
			const id = overrides.id ?? context.newId()
			return User.restore({
				id,
				name: "Contract User",
				email: `${id}@contract.test`,
				password: "hashed-password",
				createdAt: new Date("2026-01-10T12:00:00.000Z"),
				updatedAt: new Date("2026-01-10T12:00:00.000Z"),
				role: "MEMBER",
				status: "activated",
				isSuperAdmin: false,
				...overrides,
			})
		}

		it("saves a user and finds it by id, e-mail and Google id", async () => {
			const user = buildUser({ googleId: `google-${context.newId()}` })
			await context.repository.save(user)

			const byId = await context.repository.userOfId(user.id)
			const byEmail = await context.repository.userOfEmail(user.email)
			const byGoogleId = await context.repository.userOfGoogleId(
				user.googleId ?? "",
			)

			expect(byId?.id).toBe(user.id)
			expect(byId?.email).toBe(user.email)
			expect(byId?.role).toBe("MEMBER")
			expect(byId?.status).toBe("activated")
			expect(byId?.createdAt.toISOString()).toBe("2026-01-10T12:00:00.000Z")
			expect(byEmail?.id).toBe(user.id)
			expect(byGoogleId?.id).toBe(user.id)
		})

		it("returns null for an unknown id, e-mail and Google id", async () => {
			const unknown = context.newId()
			expect(await context.repository.userOfId(unknown)).toBeNull()
			expect(
				await context.repository.userOfEmail(`${unknown}@contract.test`),
			).toBeNull()
			expect(await context.repository.userOfGoogleId(unknown)).toBeNull()
		})

		it("FR-006: hides a soft-deleted user from every lookup", async () => {
			const user = buildUser({
				googleId: `google-${context.newId()}`,
				deletedAt: new Date("2026-02-01T00:00:00.000Z"),
			})
			await context.repository.save(user)

			expect(await context.repository.userOfId(user.id)).toBeNull()
			expect(await context.repository.userOfEmail(user.email)).toBeNull()
			expect(
				await context.repository.userOfGoogleId(user.googleId ?? ""),
			).toBeNull()
			expect(await context.repository.usersOfIds([user.id])).toEqual([])
		})

		it("update persists the changed profile fields", async () => {
			const id = context.newId()
			await context.repository.save(buildUser({ id }))

			await context.repository.update(
				buildUser({ id, name: "Renamed User", status: "suspended" }),
			)

			const found = await context.repository.userOfId(id)
			expect(found?.name).toBe("Renamed User")
			expect(found?.status).toBe("suspended")
		})

		it("update of a user that does not exist rejects", async () => {
			await expect(context.repository.update(buildUser())).rejects.toThrow()
		})

		it("usersOfIds returns only the stored, non-deleted users", async () => {
			const first = buildUser()
			const second = buildUser()
			const deleted = buildUser({
				deletedAt: new Date("2026-02-01T00:00:00.000Z"),
			})
			await context.repository.save(first)
			await context.repository.save(second)
			await context.repository.save(deleted)

			const found = await context.repository.usersOfIds([
				first.id,
				second.id,
				deleted.id,
				context.newId(),
			])

			expect(found.map((user) => user.id).sort()).toEqual(
				[first.id, second.id].sort(),
			)
		})

		it("updateManyStatus changes only users not already in the target status and returns how many changed", async () => {
			const active = buildUser({ status: "activated" })
			const alreadySuspended = buildUser({ status: "suspended" })
			await context.repository.save(active)
			await context.repository.save(alreadySuspended)

			const changed = await context.repository.updateManyStatus(
				[active.id, alreadySuspended.id],
				"suspended",
			)

			expect(changed).toBe(1)
			expect((await context.repository.userOfId(active.id))?.status).toBe(
				"suspended",
			)
			expect(
				(await context.repository.userOfId(alreadySuspended.id))?.status,
			).toBe("suspended")
		})

		it("updateManyStatus refreshes updatedAt of the changed users", async () => {
			const user = buildUser({ status: "activated" })
			await context.repository.save(user)
			const before = (await context.repository.userOfId(user.id))?.updatedAt

			await context.repository.updateManyStatus([user.id], "suspended")

			const after = (await context.repository.userOfId(user.id))?.updatedAt
			expect(after?.getTime()).toBeGreaterThan(before?.getTime() ?? 0)
		})

		it("get finds a user by the fields of a UserQuery", async () => {
			const user = buildUser()
			await context.repository.save(user)

			const found = await context.repository.get(
				UserQuery.from({ email: user.email }).addField("email"),
			)

			expect(found?.id).toBe(user.id)
		})
	})
}
