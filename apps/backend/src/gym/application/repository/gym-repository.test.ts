import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"

describe("GymRepository — includeInactive", () => {
	let gymRepository: InMemoryGymRepository

	beforeEach(() => {
		container.snapshot()
		gymRepository = setupInMemoryRepositories().gymRepository
	})

	afterEach(() => {
		container.restore()
	})

	test("gymOfId com includeInactive: false não retorna uma academia desativada", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const found = await gymRepository.gymOfId(gym.id, {
			includeInactive: false,
		})
		expect(found).toBeNull()
	})

	test("gymOfId com includeInactive: true retorna a academia desativada", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const found = await gymRepository.gymOfId(gym.id, { includeInactive: true })
		expect(found?.status).toBe("deactivated")
	})

	test("fetchGyms com includeInactive omitido não filtra por status (retrocompatível)", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const { items } = await gymRepository.fetchGyms({ page: 1 })
		expect(items.some((g) => g.id === gym.id)).toBe(true)
	})
})
