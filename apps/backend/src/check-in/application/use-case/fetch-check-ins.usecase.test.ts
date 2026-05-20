import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import type { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"

import type { FetchCheckInsUseCase } from "./fetch-check-ins.usecase"

describe("FetchCheckInsUseCase", () => {
	let sut: FetchCheckInsUseCase
	let checkInRepository: InMemoryCheckInRepository
	let gymRepository: InMemoryGymRepository

	beforeEach(() => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		checkInRepository = repositories.checkInRepository
		gymRepository = repositories.gymRepository
		sut = container.get<FetchCheckInsUseCase>(
			CHECKIN_TYPES.UseCases.FetchCheckIns,
		)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve retornar lista vazia quando não há check-ins", async () => {
		const result = await sut.execute({ page: 1 })
		expect(result.items).toHaveLength(0)
		expect(result.total).toBe(0)
		expect(result.page).toBe(1)
	})

	test("Deve listar todos os check-ins paginados", async () => {
		await createAndSaveGym({
			gymRepository,
			id: "gym-0",
			title: "Academia Zero",
		})
		await createAndSaveGym({ gymRepository, id: "gym-1", title: "Academia Um" })
		await createAndSaveGym({
			gymRepository,
			id: "gym-2",
			title: "Academia Dois",
		})

		for (let i = 0; i < 3; i++) {
			await createAndSaveCheckIn({
				checkInRepository,
				id: `checkin-${i}`,
				userId: "user-1",
				gymId: `gym-${i}`,
				userLatitude: -23.5,
				userLongitude: -46.6,
			})
		}

		const result = await sut.execute({ page: 1 })
		expect(result.items).toHaveLength(3)
		expect(result.total).toBe(3)
		expect(result.items[0].id).toBeDefined()
		expect(result.items[0].userId).toBe("user-1")
		expect(result.items[0].createdAt).toBeDefined()
		expect(result.items[0].validatedAt).toBeNull()
	})

	test("Deve retornar gymTitle quando a academia existe", async () => {
		await createAndSaveGym({
			gymRepository,
			id: "gym-named",
			title: "Academia das Flores",
		})
		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-named",
			userId: "user-1",
			gymId: "gym-named",
			userLatitude: 0,
			userLongitude: 0,
		})

		const result = await sut.execute({ page: 1 })
		expect(result.items[0].gymTitle).toBe("Academia das Flores")
	})

	test("Deve retornar gymTitle null quando a academia não existe", async () => {
		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-orphan",
			userId: "user-1",
			gymId: "gym-inexistente",
			userLatitude: 0,
			userLongitude: 0,
		})

		const result = await sut.execute({ page: 1 })
		expect(result.items[0].gymTitle).toBeNull()
	})

	test("Deve filtrar apenas check-ins pendentes", async () => {
		await createAndSaveCheckIn({
			checkInRepository,
			id: "pending-1",
			userId: "user-1",
			gymId: "gym-1",
			userLatitude: 0,
			userLongitude: 0,
		})

		const validatedCheckIn = await createAndSaveCheckIn({
			checkInRepository,
			id: "validated-1",
			userId: "user-2",
			gymId: "gym-2",
			userLatitude: 0,
			userLongitude: 0,
		})
		validatedCheckIn.validate()

		const result = await sut.execute({ page: 1, status: "pending" })
		expect(result.items).toHaveLength(1)
		expect(result.total).toBe(1)
	})

	test("Deve filtrar apenas check-ins validados", async () => {
		await createAndSaveCheckIn({
			checkInRepository,
			id: "pending-1",
			userId: "user-1",
			gymId: "gym-1",
			userLatitude: 0,
			userLongitude: 0,
		})

		const validatedCheckIn = await createAndSaveCheckIn({
			checkInRepository,
			id: "validated-1",
			userId: "user-2",
			gymId: "gym-2",
			userLatitude: 0,
			userLongitude: 0,
		})
		validatedCheckIn.validate()

		const result = await sut.execute({ page: 1, status: "validated" })
		expect(result.items).toHaveLength(1)
		expect(result.total).toBe(1)
		expect(result.items[0].validatedAt).not.toBeNull()
	})

	test("Deve paginar corretamente", async () => {
		for (let i = 0; i < 25; i++) {
			await createAndSaveCheckIn({
				checkInRepository,
				id: `checkin-${i}`,
				userId: "user-1",
				gymId: `gym-${i}`,
				userLatitude: 0,
				userLongitude: 0,
			})
		}

		const page1 = await sut.execute({ page: 1 })
		expect(page1.items).toHaveLength(20)
		expect(page1.total).toBe(25)

		const page2 = await sut.execute({ page: 2 })
		expect(page2.items).toHaveLength(5)
		expect(page2.total).toBe(25)
	})
})
