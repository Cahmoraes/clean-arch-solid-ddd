import { UserQuery } from "@/user/application/persistence/repository/user-query"
import { User } from "@/user/domain/user"
import { InMemoryUserRepository } from "./in-memory-user-repository"

async function makeUser(
	overrides?: Partial<Parameters<typeof User.create>[0]>,
): Promise<User> {
	return (
		await User.create({
			id: "user-id-1",
			name: "John Doe",
			email: "john.doe@example.com",
			password: "any_password",
			...overrides,
		})
	).force.success().value
}

describe("InMemoryUserRepository", () => {
	let sut: InMemoryUserRepository

	beforeEach(() => {
		sut = new InMemoryUserRepository()
	})

	describe("userOfGoogleId", () => {
		it("deve retornar o usuário correspondente ao googleId informado", async () => {
			await sut.save(
				await makeUser({
					id: "google-user-id",
					email: "google.user@example.com",
					password: undefined,
					googleId: "google-sub-123",
				}),
			)
			await sut.save(
				await makeUser({
					id: "password-user-id",
					email: "password.user@example.com",
				}),
			)

			const result = await sut.userOfGoogleId("google-sub-123")

			expect(result).not.toBeNull()
			expect(result?.id).toBe("google-user-id")
			expect(result?.googleId).toBe("google-sub-123")
		})

		it("deve retornar null quando não existir usuário para o googleId informado", async () => {
			const result = await sut.userOfGoogleId("missing-google-sub")

			expect(result).toBeNull()
		})
	})
})

describe("InMemoryUserRepository soft delete filter", () => {
	let repository: InMemoryUserRepository

	beforeEach(() => {
		repository = new InMemoryUserRepository()
	})

	async function saveDeletedUser(id: string, email: string): Promise<void> {
		const user = (
			await User.create({ id, email, name: "any_name", password: "12345678" })
		).forceSuccess().value
		user.delete()
		await repository.save(user)
	}

	test("userOfId não retorna usuário soft-deleted", async () => {
		await saveDeletedUser("user-1", "a@mail.com")
		expect(await repository.userOfId("user-1")).toBeNull()
	})

	test("userOfEmail não retorna usuário soft-deleted", async () => {
		await saveDeletedUser("user-2", "b@mail.com")
		expect(await repository.userOfEmail("b@mail.com")).toBeNull()
	})

	test("get não retorna usuário soft-deleted", async () => {
		await saveDeletedUser("user-3", "c@mail.com")
		const query = UserQuery.from({ email: "c@mail.com" }).addField("email")
		expect(await repository.get(query)).toBeNull()
	})

	test("update persiste o soft delete e o usuário some das leituras", async () => {
		const user = (
			await User.create({
				id: "user-4",
				email: "d@mail.com",
				name: "any_name",
				password: "12345678",
			})
		).forceSuccess().value
		await repository.save(user)
		expect(await repository.userOfId("user-4")).not.toBeNull()
		user.delete()
		await repository.update(user)
		expect(await repository.userOfId("user-4")).toBeNull()
	})
})

describe("usersOfIds", () => {
	test("retorna apenas os usuários cujos IDs estão na lista, ignorando IDs inexistentes", async () => {
		const sut = new InMemoryUserRepository()
		const userA = await makeUser({ id: "user-a", email: "a@example.com" })
		const userB = await makeUser({ id: "user-b", email: "b@example.com" })
		const userC = await makeUser({ id: "user-c", email: "c@example.com" })
		await sut.save(userA)
		await sut.save(userB)
		await sut.save(userC)

		const result = await sut.usersOfIds([
			"user-a",
			"user-c",
			"user-nonexistent",
		])

		expect(result).toHaveLength(2)
		expect(result.map((user) => user.id).sort()).toEqual(["user-a", "user-c"])
	})

	test("ignora usuários com exclusão lógica (soft-deleted)", async () => {
		const sut = new InMemoryUserRepository()
		const activeUser = await makeUser({
			id: "user-active",
			email: "active@example.com",
		})
		const deletedUser = await makeUser({
			id: "user-deleted",
			email: "deleted@example.com",
		})
		deletedUser.delete()
		await sut.save(activeUser)
		await sut.save(deletedUser)

		const result = await sut.usersOfIds(["user-active", "user-deleted"])

		expect(result).toHaveLength(1)
		expect(result[0]?.id).toBe("user-active")
	})
})

describe("updateManyStatus", () => {
	test("atualiza apenas os usuários com status diferente do alvo e é idempotente", async () => {
		const sut = new InMemoryUserRepository()
		const suspendedUser = await makeUser({
			id: "user-suspended",
			email: "suspended@example.com",
		})
		suspendedUser.suspend()
		const alreadyActivatedUser = await makeUser({
			id: "user-already-activated",
			email: "already@example.com",
		})
		await sut.save(suspendedUser)
		await sut.save(alreadyActivatedUser)

		const firstCallCount = await sut.updateManyStatus(
			["user-suspended", "user-already-activated"],
			"activated",
		)

		expect(firstCallCount).toBe(1)
		const updatedUser = await sut.userOfId("user-suspended")
		expect(updatedUser?.status).toBe("activated")

		const secondCallCount = await sut.updateManyStatus(
			["user-suspended", "user-already-activated"],
			"activated",
		)

		expect(secondCallCount).toBe(0)
	})
})
