import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import { GymAlreadyDeactivatedError } from "../../domain/error/gym-already-deactivated-error"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { DeactivateGymUseCase } from "./deactivate-gym.usecase"

describe("DeactivateGymUseCase", () => {
	let sut: DeactivateGymUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(async () => {
		container.snapshot()
		gymRepository = (await setupInMemoryRepositories()).gymRepository
		sut = container.get(GYM_TYPES.UseCases.DeactivateGym)
	})

	afterEach(() => {
		container.restore()
	})

	test("desativa uma academia ativa com sucesso", async () => {
		const gym = await createAndSaveGym({ gymRepository })

		const result = await sut.execute({ gymId: gym.id })

		expect(result.isSuccess()).toBe(true)
		const updated = await gymRepository.gymOfId(gym.id, {
			includeInactive: true,
		})
		expect(updated?.status).toBe("deactivated")
	})

	test("retorna failure(GymNotFoundError) para um gymId inexistente", async () => {
		const result = await sut.execute({ gymId: "non-existent-id" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)
	})

	test("retorna failure(GymAlreadyDeactivatedError) ao desativar uma academia já desativada", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		await sut.execute({ gymId: gym.id })

		const result = await sut.execute({ gymId: gym.id })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(
			GymAlreadyDeactivatedError,
		)
	})
})
