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
