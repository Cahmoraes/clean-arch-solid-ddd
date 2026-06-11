import { createAndSaveCheckIn } from "test/factory/create-and-save-check-in"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { container } from "@/shared/infra/ioc/container"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"
import type { GetCheckInStatsUseCase } from "./get-check-in-stats.usecase"

describe("GetCheckInStatsUseCase", () => {
	let sut: GetCheckInStatsUseCase
	let checkInRepository: InMemoryCheckInRepository

	beforeEach(() => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		checkInRepository = repositories.checkInRepository
		sut = container.get<GetCheckInStatsUseCase>(
			CHECKIN_TYPES.UseCases.GetCheckInStats,
		)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve retornar zeros quando não há check-ins", async () => {
		const result = await sut.execute()
		expect(result.total).toBe(0)
		expect(result.pending).toBe(0)
		expect(result.validated).toBe(0)
		expect(result.rejected).toBe(0)
	})

	test("Deve contar check-ins por status corretamente", async () => {
		const pending = await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-pending",
			userId: "user-1",
			gymId: "gym-1",
			userLatitude: 0,
			userLongitude: 0,
		})
		expect(pending.status).toBe("pending")

		const toValidate = await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-validate",
			userId: "user-2",
			gymId: "gym-2",
			userLatitude: 0,
			userLongitude: 0,
		})
		toValidate.validate()
		await checkInRepository.save(toValidate)

		const toReject = await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-reject",
			userId: "user-3",
			gymId: "gym-3",
			userLatitude: 0,
			userLongitude: 0,
		})
		toReject.reject()
		await checkInRepository.save(toReject)

		const result = await sut.execute()
		expect(result.total).toBe(3)
		expect(result.pending).toBe(1)
		expect(result.validated).toBe(1)
		expect(result.rejected).toBe(1)
	})

	test("Deve filtrar stats por userId quando fornecido", async () => {
		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-user1-a",
			userId: "user-1",
			gymId: "gym-1",
			userLatitude: 0,
			userLongitude: 0,
		})

		await createAndSaveCheckIn({
			checkInRepository,
			id: "ci-user2",
			userId: "user-2",
			gymId: "gym-2",
			userLatitude: 0,
			userLongitude: 0,
		})

		const result = await sut.execute({ userId: "user-1" })
		expect(result.total).toBe(1)
		expect(result.pending).toBe(1)
		expect(result.validated).toBe(0)
		expect(result.rejected).toBe(0)
	})
})
