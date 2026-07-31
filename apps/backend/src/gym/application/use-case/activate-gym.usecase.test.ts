import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import { GymAlreadyActivatedError } from "../../domain/error/gym-already-activated-error"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { ActivateGymUseCase } from "./activate-gym.usecase"

describe("ActivateGymUseCase", () => {
	let sut: ActivateGymUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(async () => {
		container.snapshot()
		gymRepository = (await setupInMemoryRepositories()).gymRepository
		sut = container.get(GYM_TYPES.UseCases.ActivateGym)
	})

	afterEach(() => {
		container.restore()
	})

	test("reativa uma academia desativada com sucesso", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const result = await sut.execute({ gymId: gym.id })

		expect(result.isSuccess()).toBe(true)
		const updated = await gymRepository.gymOfId(gym.id, {
			includeInactive: true,
		})
		expect(updated?.status).toBe("activated")
	})

	test("retorna failure(GymNotFoundError) para um gymId inexistente", async () => {
		const result = await sut.execute({ gymId: "non-existent-id" })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)
	})

	test("retorna failure(GymAlreadyActivatedError) ao reativar uma academia já ativa", async () => {
		const gym = await createAndSaveGym({ gymRepository })

		const result = await sut.execute({ gymId: gym.id })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymAlreadyActivatedError)
	})
})
