import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import type {
	FetchAllGymsUseCase,
	FetchAllGymsUseCaseInput,
} from "./fetch-all-gyms.usecase"

describe("FetchAllGymsUseCase", () => {
	let sut: FetchAllGymsUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(async () => {
		container.snapshot()
		gymRepository = (await setupInMemoryRepositories()).gymRepository
		sut = container.get(GYM_TYPES.UseCases.FetchAllGyms)
	})

	afterEach(() => {
		container.restore()
	})

	test("retorna data e pagination corretos quando há registros", async () => {
		const input: FetchAllGymsUseCaseInput = {
			page: 1,
		}
		await createAndSaveGym({
			id: "1",
			gymRepository,
			title: "Academia A",
			description: "Desc A",
			phone: "111111111",
			latitude: -23.563099,
			longitude: -46.656571,
		})
		await createAndSaveGym({
			id: "2",
			gymRepository,
			title: "Academia B",
			description: "Desc B",
			phone: "222222222",
			latitude: -23.563099,
			longitude: -46.656571,
		})
		await createAndSaveGym({
			id: "3",
			gymRepository,
			title: "Academia C",
			description: "Desc C",
			phone: "333333333",
			latitude: -23.563099,
			longitude: -46.656571,
		})

		const result = await sut.execute(input)

		expect(result.data).toHaveLength(3)
		expect(result.pagination.total).toBe(3)
		expect(result.pagination.page).toBe(1)
		expect(result.pagination.limit).toBe(env.ITEMS_PER_PAGE)
	})

	test("retorna data vazio e pagination.total 0 quando não há registros", async () => {
		const input: FetchAllGymsUseCaseInput = {
			page: 1,
		}
		const result = await sut.execute(input)

		expect(result.data).toEqual([])
		expect(result.pagination.total).toBe(0)
		expect(result.pagination.page).toBe(1)
		expect(result.pagination.limit).toBe(env.ITEMS_PER_PAGE)
	})

	test("respeita paginação: página 2 retorna itens diferentes", async () => {
		const input1: FetchAllGymsUseCaseInput = {
			page: 1,
		}
		const input2: FetchAllGymsUseCaseInput = {
			page: 2,
		}

		for (let i = 0; i < 25; i++) {
			await createAndSaveGym({
				id: `gym-${i}`,
				gymRepository,
				title: `Academia ${i}`,
				description: `Desc ${i}`,
				phone: "999999999",
				latitude: -23.563099,
				longitude: -46.656571,
			})
		}

		const page1 = await sut.execute(input1)
		const page2 = await sut.execute(input2)

		expect(page1.data).toHaveLength(20)
		expect(page2.data).toHaveLength(5)
		expect(page1.pagination.page).toBe(1)
		expect(page2.pagination.page).toBe(2)
		expect(page1.pagination.total).toBe(25)
		expect(page2.pagination.total).toBe(25)

		const page1Ids = page1.data.map((gym) => gym.id)
		const page2Ids = page2.data.map((gym) => gym.id)
		expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids))
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

		const result = await sut.execute({ page: 1 })

		expect(result.data.some((g) => g.id === deactivatedGym.id)).toBe(false)
		expect(result.pagination.total).toBe(1)
	})

	test("com includeInactive: true, a academia desativada aparece com status 'deactivated' no DTO", async () => {
		const deactivatedGym = await createAndSaveGym({
			id: "1",
			gymRepository,
			title: "Academia Desativada",
		})
		deactivatedGym.deactivate()
		await gymRepository.update(deactivatedGym)

		const result = await sut.execute({ page: 1, includeInactive: true })

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

		const result = await sut.execute({ page: 1, includeInactive: false })

		expect(result.data.some((g) => g.id === deactivatedGym.id)).toBe(false)
		expect(result.pagination.total).toBe(1)
	})
})
