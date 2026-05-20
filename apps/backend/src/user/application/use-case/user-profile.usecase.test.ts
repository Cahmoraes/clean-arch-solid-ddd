import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"

import { UserNotFoundError } from "../error/user-not-found-error"
import type {
	UserProfileUseCase,
	UserProfileUseCaseInput,
} from "./user-profile.usecase"

describe("UserProfile", () => {
	let sut: UserProfileUseCase
	let userRepository: InMemoryUserRepository

	beforeEach(() => {
		container.snapshot()
		userRepository = setupInMemoryRepositories().userRepository
		sut = container.get<UserProfileUseCase>(USER_TYPES.UseCases.UserProfile)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve expor hasPassword e authMethods no perfil do usuário", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@doe.com",
			password: "Senha123!",
		})

		const result = await sut.execute({ userId: user.id })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			hasPassword: true,
			authMethods: ["password"],
			status: "activated",
			createdAt: user.createdAt.toISOString(),
		})
	})

	test("Deve expor authMethods apenas com google para conta externa sem senha", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google@doe.com",
			googleId: "google-sub-123",
		})

		const result = await sut.execute({ userId: user.id })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toMatchObject({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			hasPassword: false,
			authMethods: ["google"],
		})
	})

	test("Deve expor authMethods com password e google para conta mista", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "mixed@doe.com",
			password: "Senha123!",
			googleId: "google-sub-mixed",
		})

		const result = await sut.execute({ userId: user.id })

		expect(result.forceSuccess().value).toMatchObject({
			hasPassword: true,
			authMethods: expect.arrayContaining(["password", "google"]),
		})
		expect(result.forceSuccess().value.authMethods).toHaveLength(2)
	})

	test("Deve retornar erro se o usuário não for encontrado", async () => {
		const input: UserProfileUseCaseInput = {
			userId: "invalid_id",
		}
		const leftOrRight = await sut.execute(input)
		const result = leftOrRight.force.failure().value
		expect(result).toBeInstanceOf(UserNotFoundError)
	})
})
