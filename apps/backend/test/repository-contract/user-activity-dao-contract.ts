import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type {
	UserActivityDao,
	UserActivityItemType,
} from "@/user/application/persistence/dao/user-activity-dao"

export interface ActivitySeed {
	userId: string
	gymId: string
	gymTitle: string
	events: {
		id: string
		type: UserActivityItemType
		description: string
		occurredAt: Date
	}[]
	checkIns: { id: string; occurredAt: Date }[]
}

export interface UserActivityDaoContractContext {
	seed(data: ActivitySeed): Promise<UserActivityDao>
	newId(): string
	cleanup(): Promise<void>
}

export function describeUserActivityDaoContract(
	name: string,
	factory: () => Promise<UserActivityDaoContractContext>,
): void {
	describe(`UserActivityDao contract (${name})`, () => {
		let context: UserActivityDaoContractContext
		let userId: string
		let gymId: string

		beforeEach(async () => {
			context = await factory()
			userId = context.newId()
			gymId = context.newId()
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function seedData(overrides: Partial<ActivitySeed> = {}): ActivitySeed {
			return {
				userId,
				gymId,
				gymTitle: "Academia Atividade",
				events: [
					{
						id: context.newId(),
						type: "LOGIN",
						description: "Login realizado",
						occurredAt: new Date("2026-05-10T10:00:00.000Z"),
					},
					{
						id: context.newId(),
						type: "PROFILE_UPDATED",
						description: "Perfil atualizado",
						occurredAt: new Date("2026-05-12T12:00:00.000Z"),
					},
				],
				checkIns: [
					{
						id: context.newId(),
						occurredAt: new Date("2026-05-11T11:00:00.000Z"),
					},
					{
						id: context.newId(),
						occurredAt: new Date("2026-05-13T13:00:00.000Z"),
					},
				],
				...overrides,
			}
		}

		it("FR-012: merges events and check-ins, newest first", async () => {
			const data = seedData()
			const dao = await context.seed(data)

			const page = await dao.findActivityPage(userId, 1, 10)

			expect(page.items.map((item) => item.id)).toEqual([
				data.checkIns[1].id,
				data.events[1].id,
				data.checkIns[0].id,
				data.events[0].id,
			])
			expect(page.pagination).toEqual({
				page: 1,
				pageSize: 10,
				total: 4,
				totalPages: 1,
			})
		})

		it("describes a check-in with the gym title and the CHECK_IN type", async () => {
			const data = seedData({
				events: [],
				checkIns: [
					{
						id: context.newId(),
						occurredAt: new Date("2026-05-11T11:00:00.000Z"),
					},
				],
			})
			const dao = await context.seed(data)

			const page = await dao.findActivityPage(userId, 1, 10)

			expect(page.items).toEqual([
				{
					id: data.checkIns[0].id,
					type: "CHECK_IN",
					description: "Check-in — Academia Atividade",
					occurredAt: new Date("2026-05-11T11:00:00.000Z"),
				},
			])
		})

		it("maps the stored event fields", async () => {
			const data = seedData({ checkIns: [] })
			const dao = await context.seed(data)

			const page = await dao.findActivityPage(userId, 1, 10)

			expect(page.items).toContainEqual({
				id: data.events[1].id,
				type: "PROFILE_UPDATED",
				description: "Perfil atualizado",
				occurredAt: new Date("2026-05-12T12:00:00.000Z"),
			})
		})

		it("paginates the merged list and reports the page metadata", async () => {
			const data = seedData()
			const dao = await context.seed(data)

			const first = await dao.findActivityPage(userId, 1, 2)
			const second = await dao.findActivityPage(userId, 2, 2)

			expect(first.items.map((item) => item.id)).toEqual([
				data.checkIns[1].id,
				data.events[1].id,
			])
			expect(second.items.map((item) => item.id)).toEqual([
				data.checkIns[0].id,
				data.events[0].id,
			])
			expect(second.pagination).toEqual({
				page: 2,
				pageSize: 2,
				total: 4,
				totalPages: 2,
			})
		})

		it("a page past the last one returns no items but keeps the pagination", async () => {
			const dao = await context.seed(seedData())

			const page = await dao.findActivityPage(userId, 5, 2)

			expect(page.items).toEqual([])
			expect(page.pagination).toEqual({
				page: 5,
				pageSize: 2,
				total: 4,
				totalPages: 2,
			})
		})

		it("events with the same instant are ordered by id descending", async () => {
			const sameInstant = new Date("2026-05-10T10:00:00.000Z")
			const firstId = context.newId()
			const secondId = context.newId()
			const data = seedData({
				checkIns: [],
				events: [
					{
						id: firstId,
						type: "LOGIN",
						description: "a",
						occurredAt: sameInstant,
					},
					{
						id: secondId,
						type: "LOGIN",
						description: "b",
						occurredAt: sameInstant,
					},
				],
			})
			const dao = await context.seed(data)

			const page = await dao.findActivityPage(userId, 1, 10)

			expect(page.items.map((item) => item.id)).toEqual(
				[firstId, secondId].sort().reverse(),
			)
		})
	})
}
