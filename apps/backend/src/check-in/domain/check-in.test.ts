import { CheckInAlreadyRejectedError } from "@/check-in/domain/error/check-in-already-rejected-error"
import { CheckInTimeExceededError } from "@/check-in/domain/error/check-in-time-exceeded-error"

import {
	CheckIn,
	type CheckInCreateProps,
	type CheckInRestoreProps,
} from "./check-in"

describe("CheckIn Entity", () => {
	describe("create", () => {
		test("Deve criar um check-in pendente", () => {
			const input: CheckInCreateProps = {
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			}
			const checkIn = CheckIn.create(input)
			expect(checkIn.id).toEqual("any_id")
			expect(checkIn.userId).toEqual("any_user_id")
			expect(checkIn.gymId).toEqual("any_gym_id")
			expect(checkIn.createdAt).toEqual(expect.any(Date))
			expect(checkIn.validatedAt).toBeUndefined()
			expect(checkIn.rejectedAt).toBeUndefined()
			expect(checkIn.status).toEqual("pending")
			expect(checkIn.latitude).toEqual(0)
			expect(checkIn.longitude).toEqual(10)
		})
	})

	describe("restore", () => {
		test("Deve restaurar um CheckIn validado", () => {
			const input: CheckInRestoreProps = {
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				createdAt: new Date(),
				validatedAt: new Date(),
				userLatitude: 0,
				userLongitude: 0,
			}
			const checkIn = CheckIn.restore(input)
			expect(checkIn).toBeInstanceOf(CheckIn)
			expect(checkIn.status).toEqual("validated")
			expect(checkIn.validatedAt).toEqual(input.validatedAt)
			expect(checkIn.rejectedAt).toBeUndefined()
		})

		test("Deve restaurar um CheckIn rejeitado", () => {
			const input: CheckInRestoreProps = {
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				createdAt: new Date(),
				rejectedAt: new Date(),
				userLatitude: 0,
				userLongitude: 0,
			}
			const checkIn = CheckIn.restore(input)
			expect(checkIn.status).toEqual("rejected")
			expect(checkIn.rejectedAt).toEqual(input.rejectedAt)
			expect(checkIn.validatedAt).toBeUndefined()
		})

		test("Deve restaurar um CheckIn pendente", () => {
			const input: CheckInRestoreProps = {
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				createdAt: new Date(),
				userLatitude: 0,
				userLongitude: 0,
			}
			const checkIn = CheckIn.restore(input)
			expect(checkIn.status).toEqual("pending")
			expect(checkIn.validatedAt).toBeUndefined()
			expect(checkIn.rejectedAt).toBeUndefined()
		})
	})

	describe("validate", () => {
		test("Deve validar um check-in pendente", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			const result = checkIn.validate()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("validated")
			expect(checkIn.validatedAt).toBeInstanceOf(Date)
			expect(checkIn.rejectedAt).toBeUndefined()
			vi.useRealTimers()
		})

		test("Não deve validar um check-in após o tempo limite", () => {
			vi.useFakeTimers()
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			vi.advanceTimersByTime(1000 * 60 * 21)
			const result = checkIn.validate()
			expect(checkIn.status).toEqual("pending")
			expect(result.forceFailure().value).toBeInstanceOf(
				CheckInTimeExceededError,
			)
			vi.useRealTimers()
		})

		test("Não deve validar um check-in rejeitado", () => {
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.reject()
			const result = checkIn.validate()
			expect(result.isFailure()).toBe(true)
			expect(result.forceFailure().value).toBeInstanceOf(
				CheckInAlreadyRejectedError,
			)
			expect(checkIn.status).toEqual("rejected")
		})

		test("Validar um check-in já validado é idempotente", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.validate()
			const result = checkIn.validate()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("validated")
			vi.useRealTimers()
		})
	})

	describe("reject", () => {
		test("Deve rejeitar um check-in pendente", () => {
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			const result = checkIn.reject()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("rejected")
			expect(checkIn.rejectedAt).toBeInstanceOf(Date)
			expect(checkIn.validatedAt).toBeUndefined()
		})

		test("Deve rejeitar um check-in validado (reversão)", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.validate()
			expect(checkIn.status).toEqual("validated")
			expect(checkIn.validatedAt).toBeDefined()

			const result = checkIn.reject()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("rejected")
			expect(checkIn.rejectedAt).toBeInstanceOf(Date)
			expect(checkIn.validatedAt).toBeUndefined()
			vi.useRealTimers()
		})

		test("Rejeitar um check-in já rejeitado é idempotente", () => {
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.reject()
			const rejectedAt = checkIn.rejectedAt
			const result = checkIn.reject()
			expect(result.isSuccess()).toBe(true)
			expect(checkIn.status).toEqual("rejected")
			expect(checkIn.rejectedAt).toEqual(rejectedAt)
		})
	})

	describe("invariante: validatedAt e rejectedAt nunca coexistem", () => {
		test("Após rejeitar pendente: apenas rejectedAt está setado", () => {
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.reject()
			expect(checkIn.validatedAt).toBeUndefined()
			expect(checkIn.rejectedAt).toBeDefined()
		})

		test("Após validar pendente: apenas validatedAt está setado", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.validate()
			expect(checkIn.validatedAt).toBeDefined()
			expect(checkIn.rejectedAt).toBeUndefined()
			vi.useRealTimers()
		})

		test("Após rejeitar validado: validatedAt é limpo, apenas rejectedAt está setado", () => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date("2021-01-01"))
			const checkIn = CheckIn.create({
				id: "any_id",
				userId: "any_user_id",
				gymId: "any_gym_id",
				userLatitude: 0,
				userLongitude: 10,
			})
			checkIn.validate()
			checkIn.reject()
			expect(checkIn.validatedAt).toBeUndefined()
			expect(checkIn.rejectedAt).toBeDefined()
			vi.useRealTimers()
		})
	})
})
