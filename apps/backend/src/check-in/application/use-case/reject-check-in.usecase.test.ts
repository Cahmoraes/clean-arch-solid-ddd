import {
	type CreateAndSaveCheckInProps,
	createAndSaveCheckIn,
} from "test/factory/create-and-save-check-in"

import { InMemoryCheckInRepository } from "@/shared/infra/database/repository/in-memory/in-memory-check-in-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { CHECKIN_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"

import { CheckInNotFoundError } from "../error/check-in-not-found-error"
import type {
	RejectCheckInUseCase,
	RejectCheckInUseCaseInput,
} from "./reject-check-in.usecase"

describe("RejectCheckIn", () => {
	let sut: RejectCheckInUseCase
	let checkInRepository: InMemoryCheckInRepository
	let userRepository: InMemoryUserRepository

	beforeEach(async () => {
		container.snapshot()
		checkInRepository = new InMemoryCheckInRepository()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(CHECKIN_TYPES.Repositories.CheckIn)
			.toConstantValue(checkInRepository)
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		sut = container.get(CHECKIN_TYPES.UseCases.RejectCheckIn)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve rejeitar um check-in pendente", async () => {
		const createCheckInProps: CreateAndSaveCheckInProps = {
			checkInRepository,
			gymId: "any_gym_id",
			id: "check-in-id",
			userId: "any_user_id",
		}
		const checkIn = await createAndSaveCheckIn(createCheckInProps)
		const input: RejectCheckInUseCaseInput = {
			checkInId: checkIn.id,
		}
		const result = await sut.execute(input)
		const right = result.force.success().value
		expect(right.rejectedAt).toBeInstanceOf(Date)
		expect(checkIn.status).toBe("rejected")
	})

	test("Deve rejeitar um check-in validado (reversão)", async () => {
		const createCheckInProps: CreateAndSaveCheckInProps = {
			checkInRepository,
			gymId: "any_gym_id",
			id: "check-in-id",
			userId: "any_user_id",
		}
		const checkIn = await createAndSaveCheckIn(createCheckInProps)
		checkIn.validate()
		await checkInRepository.save(checkIn)

		const input: RejectCheckInUseCaseInput = {
			checkInId: checkIn.id,
		}
		const result = await sut.execute(input)
		const right = result.force.success().value
		expect(result.isSuccess()).toBe(true)
		expect(right.rejectedAt).toBeInstanceOf(Date)
		expect(checkIn.status).toBe("rejected")
		expect(checkIn.validatedAt).toBeUndefined()
	})

	test("Deve ser idempotente ao rejeitar check-in já rejeitado", async () => {
		const createCheckInProps: CreateAndSaveCheckInProps = {
			checkInRepository,
			gymId: "any_gym_id",
			id: "check-in-id",
			userId: "any_user_id",
		}
		const checkIn = await createAndSaveCheckIn(createCheckInProps)
		checkIn.reject()
		await checkInRepository.save(checkIn)

		const input: RejectCheckInUseCaseInput = {
			checkInId: checkIn.id,
		}
		const result = await sut.execute(input)
		expect(result.isSuccess()).toBe(true)
	})

	test("Deve retornar CheckInNotFoundError para ID inexistente", async () => {
		const input: RejectCheckInUseCaseInput = {
			checkInId: "non-existent-id",
		}
		const result = await sut.execute(input)
		const left = result.force.failure().value
		expect(left).toBeInstanceOf(CheckInNotFoundError)
	})
})
