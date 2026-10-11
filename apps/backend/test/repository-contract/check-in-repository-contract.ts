import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest"
import type { CheckInRepository } from "@/check-in/application/repository/check-in-repository"
import { CheckIn } from "@/check-in/domain/check-in"
import { pinTimeZone } from "./pin-time-zone"

export interface CheckInRepositoryContractContext {
	repository: CheckInRepository
	newId(): string
	ensureReferences(references: {
		userIds: string[]
		gymIds: string[]
	}): Promise<void>
	cleanup(): Promise<void>
}

type CheckInProps = Parameters<typeof CheckIn.restore>[0]

export function describeCheckInRepositoryContract(
	name: string,
	factory: () => Promise<CheckInRepositoryContractContext>,
): void {
	describe(`CheckInRepository contract (${name})`, () => {
		let context: CheckInRepositoryContractContext
		let restoreTimeZone: () => void
		let userId: string
		let gymId: string

		beforeAll(() => {
			restoreTimeZone = pinTimeZone("America/Sao_Paulo")
		})

		afterAll(() => {
			restoreTimeZone()
		})

		beforeEach(async () => {
			context = await factory()
			userId = context.newId()
			gymId = context.newId()
			await context.ensureReferences({ userIds: [userId], gymIds: [gymId] })
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildCheckIn(overrides: Partial<CheckInProps> = {}): CheckIn {
			return CheckIn.restore({
				id: context.newId(),
				gymId,
				userId,
				createdAt: new Date("2026-05-10T15:00:00.000Z"),
				userLatitude: -23.5505,
				userLongitude: -46.6333,
				...overrides,
			})
		}

		it("saves a check-in and finds it by id", async () => {
			const checkIn = buildCheckIn()

			const saved = await context.repository.save(checkIn)
			const found = await context.repository.checkOfById(checkIn.id)

			expect(saved).toEqual({ id: checkIn.id })
			expect(found?.userId).toBe(userId)
			expect(found?.gymId).toBe(gymId)
			expect(found?.createdAt.toISOString()).toBe("2026-05-10T15:00:00.000Z")
			expect(found?.status).toBe("pending")
		})

		it("returns null for an unknown id", async () => {
			expect(await context.repository.checkOfById(context.newId())).toBeNull()
		})

		it("saving an existing id again moves validatedAt", async () => {
			const checkIn = buildCheckIn()
			await context.repository.save(checkIn)

			await context.repository.save(
				buildCheckIn({
					id: checkIn.id,
					validatedAt: new Date("2026-05-10T15:10:00.000Z"),
				}),
			)

			const found = await context.repository.checkOfById(checkIn.id)
			expect(found?.status).toBe("validated")
			expect(found?.validatedAt?.toISOString()).toBe("2026-05-10T15:10:00.000Z")
		})

		it("onSameDateOfUserId is true only for the same user on the same local day", async () => {
			const otherUserId = context.newId()
			await context.ensureReferences({ userIds: [otherUserId], gymIds: [] })
			await context.repository.save(
				buildCheckIn({ createdAt: new Date("2026-05-10T15:00:00.000Z") }),
			)

			const sameDay = new Date("2026-05-10T23:00:00.000Z")
			const nextDay = new Date("2026-05-12T15:00:00.000Z")

			expect(await context.repository.onSameDateOfUserId(userId, sameDay)).toBe(
				true,
			)
			expect(await context.repository.onSameDateOfUserId(userId, nextDay)).toBe(
				false,
			)
			expect(
				await context.repository.onSameDateOfUserId(otherUserId, sameDay),
			).toBe(false)
		})

		it("onSameDateOfUserId uses the local calendar day near midnight (America/Sao_Paulo)", async () => {
			// 2026-03-11T02:30:00Z is 23:30 on March 10th in America/Sao_Paulo.
			await context.repository.save(
				buildCheckIn({ createdAt: new Date("2026-03-11T02:30:00.000Z") }),
			)

			// 22:00 on March 10th local: same local day, different UTC day.
			expect(
				await context.repository.onSameDateOfUserId(
					userId,
					new Date("2026-03-11T01:00:00.000Z"),
				),
			).toBe(true)
			// 00:30 on March 11th local: next local day, same UTC day.
			expect(
				await context.repository.onSameDateOfUserId(
					userId,
					new Date("2026-03-11T03:30:00.000Z"),
				),
			).toBe(false)
		})

		it("countByStatus counts pending, validated and rejected check-ins of a user", async () => {
			await context.repository.save(
				buildCheckIn({ createdAt: new Date("2026-05-01T15:00:00.000Z") }),
			)
			await context.repository.save(
				buildCheckIn({
					createdAt: new Date("2026-05-02T15:00:00.000Z"),
					validatedAt: new Date("2026-05-02T15:05:00.000Z"),
				}),
			)
			await context.repository.save(
				buildCheckIn({
					createdAt: new Date("2026-05-03T15:00:00.000Z"),
					rejectedAt: new Date("2026-05-03T15:05:00.000Z"),
				}),
			)

			const stats = await context.repository.countByStatus(userId)

			expect(stats).toEqual({ total: 3, pending: 1, validated: 1, rejected: 1 })
		})

		it("FR-012: findMany filters by user and status and reports the total", async () => {
			const pending = buildCheckIn({
				createdAt: new Date("2026-05-01T15:00:00.000Z"),
			})
			const validated = buildCheckIn({
				createdAt: new Date("2026-05-02T15:00:00.000Z"),
				validatedAt: new Date("2026-05-02T15:05:00.000Z"),
			})
			await context.repository.save(pending)
			await context.repository.save(validated)

			const all = await context.repository.findMany({
				page: 1,
				userId,
				sortOrder: "asc",
			})
			const onlyValidated = await context.repository.findMany({
				page: 1,
				userId,
				status: "validated",
				sortOrder: "asc",
			})

			expect(all.total).toBe(2)
			expect(all.items.map((item) => item.id)).toEqual([
				pending.id,
				validated.id,
			])
			expect(onlyValidated.total).toBe(1)
			expect(onlyValidated.items.map((item) => item.id)).toEqual([validated.id])
		})

		it("FR-012: findMany orders by creation date ascending or descending", async () => {
			const first = buildCheckIn({
				createdAt: new Date("2026-05-01T15:00:00.000Z"),
			})
			const second = buildCheckIn({
				createdAt: new Date("2026-05-02T15:00:00.000Z"),
			})
			const third = buildCheckIn({
				createdAt: new Date("2026-05-03T15:00:00.000Z"),
			})
			await context.repository.save(second)
			await context.repository.save(first)
			await context.repository.save(third)

			const ascending = await context.repository.findMany({
				page: 1,
				userId,
				sortOrder: "asc",
			})
			const descending = await context.repository.findMany({
				page: 1,
				userId,
				sortOrder: "desc",
			})

			expect(ascending.items.map((item) => item.id)).toEqual([
				first.id,
				second.id,
				third.id,
			])
			expect(descending.items.map((item) => item.id)).toEqual([
				third.id,
				second.id,
				first.id,
			])
		})
	})
}
