import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import type {
	SearchGymUseCase,
	SearchGymUseCaseInput,
} from "./search-gym.usecase"

describe("SearchGymUseCase", () => {
	let sut: SearchGymUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(async () => {
		container.snapshot()
		gymRepository = (await setupInMemoryRepositories()).gymRepository
		sut = container.get(GYM_TYPES.UseCases.SearchGym)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve buscar uma academia pelo nome", async () => {
		const input: SearchGymUseCaseInput = {
			name: "Academia Teste",
		}
		await createAndSaveGym({
			id: "1",
			gymRepository,
			title: "Academia Teste",
			description: "Academia Teste descrição",
			phone: "999999999",
			latitude: -23.563099,
			longitude: -46.656571,
		})
		const result = await sut.execute(input)
		const gym = result.data[0]
		expect(gym.id).toBeDefined()
		expect(gym.title).toBe("Academia Teste")
		expect(gym.description).toBe("Academia Teste descrição")
		expect(gym.phone).toBe("999999999")
		expect(gym.latitude).toBe(-23.563099)
		expect(gym.longitude).toBe(-46.656571)
		expect(result.pagination.total).toBe(1)
		expect(result.pagination.page).toBe(1)
		expect(result.pagination.limit).toBe(env.ITEMS_PER_PAGE)
	})

	test("Deve paginar academias", async () => {
		const input: SearchGymUseCaseInput = {
			name: "Academia Teste",
			page: 2,
		}
		for (let i = 0; i <= 22; i++) {
			await createAndSaveGym({
				id: `gym-${i}`,
				gymRepository,
				title: `Academia Teste ${i}`,
				description: "Academia Teste descrição",
				phone: "999999999",
				latitude: -23.563099,
				longitude: -46.656571,
			})
		}
		const result = await sut.execute(input)
		expect(result.data).toHaveLength(3)
		expect(result.data[0].title).toBe("Academia Teste 20")
		expect(result.data[1].title).toBe("Academia Teste 21")
		expect(result.data[2].title).toBe("Academia Teste 22")
		expect(result.pagination.total).toBe(23)
		expect(result.pagination.page).toBe(2)
		expect(result.pagination.limit).toBe(env.ITEMS_PER_PAGE)
	})

	test("com includeInactive omitido, uma academia desativada não aparece no resultado", async () => {
		await createAndSaveGym({ id: "1", gymRepository, title: "Academia Ativa" })
		const deactivatedGym = await createAndSaveGym({
			id: "2",
			gymRepository,
			title: "Academia Desativada",
		})
		deactivatedGym.deactivate()
		await gymRepository.update(deactivatedGym)

		const result = await sut.execute({ name: "Desativada" })

		expect(result.data.some((g) => g.id === deactivatedGym.id)).toBe(false)
	})

	test("com includeInactive: true, a academia desativada aparece com status 'deactivated' no DTO", async () => {
		const deactivatedGym = await createAndSaveGym({
			id: "1",
			gymRepository,
			title: "Academia Desativada",
		})
		deactivatedGym.deactivate()
		await gymRepository.update(deactivatedGym)

		const result = await sut.execute({
			name: "Desativada",
			includeInactive: true,
		})

		const found = result.data.find((g) => g.id === deactivatedGym.id)
		expect(found?.status).toBe("deactivated")
	})

	test("com includeInactive: false explícito, a academia desativada não aparece", async () => {
		await createAndSaveGym({ id: "1", gymRepository, title: "Academia Ativa" })
		const deactivatedGym = await createAndSaveGym({
			id: "2",
			gymRepository,
			title: "Academia Desativada",
		})
		deactivatedGym.deactivate()
		await gymRepository.update(deactivatedGym)

		const result = await sut.execute({
			name: "Desativada",
			includeInactive: false,
		})

		expect(result.data.some((g) => g.id === deactivatedGym.id)).toBe(false)
	})
})
