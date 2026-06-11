import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { UserNotFoundError } from "@/user/application/error/user-not-found-error"
import {
	UpdateMyProfileUseCase,
	type UpdateMyProfileUseCaseInput,
} from "./update-my-profile.usecase"

describe("UpdateMyProfileUseCase", () => {
	let sut: UpdateMyProfileUseCase
	let userRepository: InMemoryUserRepository

	beforeEach(async () => {
		container.snapshot()
		userRepository = (await setupInMemoryRepositories()).userRepository
		sut = container.get(UpdateMyProfileUseCase, { autobind: true })
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve atualizar o nome do usuário autenticado", async () => {
		const user = await createAndSaveUser({
			userRepository,
			name: "João Silva",
			email: "joao@example.com",
			password: "Senha123!",
		})

		const input: UpdateMyProfileUseCaseInput = {
			userId: user.id,
			name: "João Carlos Silva",
		}

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({ name: "João Carlos Silva" })
		const updated = await userRepository.userOfId(user.id)
		expect(updated?.name).toBe("João Carlos Silva")
		expect(updated?.email).toBe("joao@example.com")
	})

	test("Não deve atualizar o nome para um usuário inexistente", async () => {
		const input: UpdateMyProfileUseCaseInput = {
			userId: "non-existent-id",
			name: "Novo Nome",
		}

		const result = await sut.execute(input)

		expect(result.isFailure()).toBe(true)
		expect(result.force.failure().value).toBeInstanceOf(UserNotFoundError)
	})

	test("Não deve atualizar o nome para um valor inválido (muito curto)", async () => {
		const user = await createAndSaveUser({
			userRepository,
			name: "João Silva",
			email: "joao@example.com",
		})

		const input: UpdateMyProfileUseCaseInput = {
			userId: user.id,
			name: "A",
		}

		const result = await sut.execute(input)

		expect(result.isFailure()).toBe(true)
		const updated = await userRepository.userOfId(user.id)
		expect(updated?.name).toBe("João Silva")
	})

	test("Não deve alterar o e-mail do usuário ao atualizar o nome", async () => {
		const user = await createAndSaveUser({
			userRepository,
			name: "João Silva",
			email: "joao@example.com",
		})

		await sut.execute({ userId: user.id, name: "João Atualizado" })

		const updated = await userRepository.userOfId(user.id)
		expect(updated?.email).toBe("joao@example.com")
	})
})
