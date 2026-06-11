import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { createAndSaveUser } from "./create-and-save-user"

describe("createAndSaveUser", () => {
	let userRepository: InMemoryUserRepository

	beforeEach(() => {
		userRepository = new InMemoryUserRepository()
	})

	it("deve criar um usuário somente com googleId quando password não for informada", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "google-user-id",
			email: "google.user@example.com",
			googleId: "google-sub-456",
		})

		const persistedUser = await userRepository.userOfGoogleId("google-sub-456")

		expect(user.id).toBe("google-user-id")
		expect(user.googleId).toBe("google-sub-456")
		expect(user.password).toBeUndefined()
		expect(persistedUser?.id).toBe("google-user-id")
	})

	it("deve repassar password vazio sem acionar o fallback padrão", async () => {
		await expect(
			createAndSaveUser({
				userRepository,
				email: "empty.password@example.com",
				password: "",
			}),
		).rejects.toThrow()
	})

	it("deve usar any_password quando nem password nem googleId forem informados", async () => {
		const user = await createAndSaveUser({
			userRepository,
			id: "default-password-user-id",
			email: "default.password@example.com",
		})

		expect(user.id).toBe("default-password-user-id")
		await expect(user.checkPassword("any_password")).resolves.toBe(true)
	})
})
