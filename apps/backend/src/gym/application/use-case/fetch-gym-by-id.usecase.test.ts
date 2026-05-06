import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import type {
	FetchGymByIdUseCase,
	FetchGymByIdUseCaseInput,
} from "./fetch-gym-by-id.usecase"

describe("FetchGymByIdUseCase", () => {
	let sut: FetchGymByIdUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(async () => {
		container.snapshot()
		gymRepository = (await setupInMemoryRepositories()).gymRepository
		sut = container.get(GYM_TYPES.UseCases.FetchGymById)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve retornar a academia quando encontrada pelo ID", async () => {
		await createAndSaveGym({
			id: "gym-abc",
			gymRepository,
			title: "Academia Teste",
			description: "Ótima academia",
			phone: "11988887777",
			address: "Rua das Flores, 10",
			latitude: -23.563099,
			longitude: -46.656571,
		})

		const input: FetchGymByIdUseCaseInput = { gymId: "gym-abc" }
		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.id).toBe("gym-abc")
			expect(result.value.title).toBe("Academia Teste")
			expect(result.value.description).toBe("Ótima academia")
			expect(result.value.phone).toBe("11988887777")
			expect(result.value.latitude).toBe(-23.563099)
			expect(result.value.longitude).toBe(-46.656571)
		}
	})

	test("Deve retornar GymNotFoundError quando academia não existe", async () => {
		const input: FetchGymByIdUseCaseInput = { gymId: "nao-existe" }
		const result = await sut.execute(input)

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(Error)
			expect(result.value.message).toBe("Gym not found")
		}
	})

	test("Deve normalizar campos opcionais ausentes para null", async () => {
		await createAndSaveGym({
			id: "gym-minimal",
			gymRepository,
			title: "Academia Mínima",
			latitude: -23.0,
			longitude: -46.0,
		})

		const result = await sut.execute({ gymId: "gym-minimal" })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.description).toBeNull()
			expect(result.value.phone).toBeNull()
		}
	})
})
