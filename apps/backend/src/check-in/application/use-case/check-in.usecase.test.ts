import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"

import { GymNotFoundError } from "@/gym/application/error/gym-not-found-error"
import { Gym } from "@/gym/domain/gym"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { EVENTS } from "@/shared/domain/event/events"
import type { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"
import { UserHasAlreadyCheckedInToday } from "@/user/application/error/user-has-already-checked-in-today"
import { UserNotFoundError } from "@/user/application/error/user-not-found-error"

import { DuplicateCheckInError } from "../error/duplicate-check-in-error"
import { MaxDistanceError } from "../error/max-distance-error"
import type { CheckInUseCase, CheckInUseCaseInput } from "./check-in.usecase"

describe("CheckInUseCase", () => {
	let gymRepository: InMemoryGymRepository
	let userRepository: InMemoryUserRepository
	let checkInRepository: InMemoryCheckInRepository
	let sut: CheckInUseCase

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		gymRepository = repositories.gymRepository
		userRepository = repositories.userRepository
		checkInRepository = repositories.checkInRepository
		sut = container.get<CheckInUseCase>(CHECKIN_TYPES.UseCases.CheckIn)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve criar um check-in", async () => {
		const userId = "any_user_id"
		await createAndSaveUser({
			userRepository,
			id: userId,
		})
		const gymId = "any_gym_id"
		await _createAndSaveGym(gymId, -27.0747279, -49.4889672)
		const input: CheckInUseCaseInput = {
			userId,
			gymId,
			userLatitude: -27.0747279,
			userLongitude: -49.4889672,
		}
		const subscriber = vi.fn()
		DomainEventPublisher.instance.subscribe(EVENTS.CHECK_IN_CREATED, subscriber)
		const result = await sut.execute(input)
		expect(result.forceSuccess().value.checkInId).toEqual(expect.any(String))
		expect(result.forceSuccess().value.date).toEqual(expect.any(Date))
		const checkInSaved = checkInRepository.checkIns.toArray()[0]
		expect(checkInSaved.id).toEqual(result.forceSuccess().value.checkInId)
		expect(subscriber).toHaveBeenCalledTimes(1)
		DomainEventPublisher.instance.unsubscribe(
			EVENTS.CHECK_IN_CREATED,
			subscriber,
		)
	})

	test("Não deve criar um check-in se o usuário não existir", async () => {
		const input: CheckInUseCaseInput = {
			userId: "any_user_id",
			gymId: "any_gym_id",
			userLatitude: -27.0747279,
			userLongitude: -49.4889672,
		}
		const result = await sut.execute(input)
		expect(result.forceFailure().value).toBeInstanceOf(UserNotFoundError)
	})

	test("Não deve criar um check-in se a academia não existir", async () => {
		const userId = "any_user_id"
		await createAndSaveUser({
			userRepository,
			id: userId,
		})
		const input: CheckInUseCaseInput = {
			userId,
			gymId: "any_gym_id",
			userLatitude: -27.0747279,
			userLongitude: -49.4889672,
		}
		const result = await sut.execute(input)
		expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)
	})

	test("Não deve criar dois check-ins no mesmo dia", async () => {
		const userId = "any_user_id"
		await createAndSaveUser({
			userRepository,
			id: userId,
		})
		await _createAndSaveGym("any_gym_id", -27.0747279, -49.4889672)
		const input: CheckInUseCaseInput = {
			userId,
			gymId: "any_gym_id",
			userLatitude: -27.0747279,
			userLongitude: -49.4889672,
		}
		await sut.execute(input)
		const result = await sut.execute(input)
		expect(result.forceFailure().value).toBeInstanceOf(
			UserHasAlreadyCheckedInToday,
		)
	})

	test("Deve criar dois check-ins no mesmo dia para usuários diferentes", async () => {
		const user_one_Id = "any_user_one_id"
		await createAndSaveUser({
			userRepository,
			id: user_one_Id,
		})

		const user_two_Id = "any_user_two_id"
		await createAndSaveUser({
			userRepository,
			id: user_two_Id,
		})

		await _createAndSaveGym("any_gym_id", -27.0747279, -49.4889672)
		const inputUserOne: CheckInUseCaseInput = {
			userId: user_one_Id,
			gymId: "any_gym_id",
			userLatitude: -27.0747279,
			userLongitude: -49.4889672,
		}
		await sut.execute(inputUserOne)

		const inputUserTwo: CheckInUseCaseInput = {
			userId: user_two_Id,
			gymId: "any_gym_id",
			userLatitude: -27.0747279,
			userLongitude: -49.4889672,
		}
		const result = await sut.execute(inputUserTwo)
		expect(result.forceSuccess().value.checkInId).toEqual(expect.any(String))
	})

	test("Não deve ser possível criar um check-in distante de 100 metros", async () => {
		const userId = "any_user_id"
		await createAndSaveUser({
			userRepository,
			id: userId,
		})
		await _createAndSaveGym("any_gym_id", -27.0747279, -49.4889672)
		const input: CheckInUseCaseInput = {
			userId,
			gymId: "any_gym_id",
			userLatitude: -27.0747279,
			userLongitude: -48.4889672,
		}
		const result = await sut.execute(input)
		expect(result.forceFailure().value).toBeInstanceOf(MaxDistanceError)
	})

	test("Deve retornar UserHasAlreadyCheckedInToday quando o banco rejeitar por unique constraint (concorrência)", async () => {
		const userId = "any_user_id"
		await createAndSaveUser({ userRepository, id: userId })
		await _createAndSaveGym("any_gym_id", -27.0747279, -49.4889672)
		const input: CheckInUseCaseInput = {
			userId,
			gymId: "any_gym_id",
			userLatitude: -27.0747279,
			userLongitude: -49.4889672,
		}
		vi.spyOn(checkInRepository, "save").mockRejectedValueOnce(
			new DuplicateCheckInError(),
		)
		const result = await sut.execute(input)
		expect(result.forceFailure().value).toBeInstanceOf(
			UserHasAlreadyCheckedInToday,
		)
	})

	async function _createAndSaveGym(id?: string, latitude = 0, longitude = 0) {
		const gymId = id ?? "any_gym_id"
		const gym = Gym.create({
			id: gymId,
			title: "any_name",
			latitude,
			longitude,
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}).forceSuccess().value
		await gymRepository.save(gym)
		return gymRepository.gyms.toArray()[0]
	}
})
