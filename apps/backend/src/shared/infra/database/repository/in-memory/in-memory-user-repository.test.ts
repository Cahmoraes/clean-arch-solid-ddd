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
