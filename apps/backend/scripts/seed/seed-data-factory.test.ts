import { describe, expect, it } from "vitest"
import { buildSeedData } from "./seed-data-factory"

const NOW = new Date("2026-06-15T10:00:00.000Z")

function build() {
	return buildSeedData({
		memberPasswordHash: "hashed-member-password",
		now: NOW,
	})
}

describe("buildSeedData", () => {
	it("FR-018: builds 50 members and 50 gyms like the Prisma seed", () => {
		const data = build()

		expect(data.users).toHaveLength(50)
		expect(data.users.map((user) => user.email)).toEqual(
			Array.from(
				{ length: 50 },
				(_, index) => `member${index + 1}@example.com`,
			),
		)
		expect(data.users.every((user) => user.role === "MEMBER")).toBe(true)
		expect(data.gyms).toHaveLength(50)
		expect(new Set(data.gyms.map((gym) => gym.cnpj)).size).toBe(50)
	})

	it("FR-018: gives members 191 check-ins in total, 8 at most per member, on distinct UTC days between 2 and 90 days back", () => {
		const data = build()

		const byUser = new Map<string, Date[]>()
		for (const checkIn of data.checkIns) {
			byUser.set(checkIn.userId, [
				...(byUser.get(checkIn.userId) ?? []),
				checkIn.createdAt,
			])
		}
		for (const dates of byUser.values()) {
			const days = dates.map((date) => date.toISOString().slice(0, 10))
			expect(new Set(days).size).toBe(days.length)
		}
		expect(data.checkIns).toHaveLength(191)
		expect(byUser.size).toBe(42)
		expect(Math.max(...[...byUser.values()].map((dates) => dates.length))).toBe(
			8,
		)
		const times = data.checkIns.map((checkIn) => checkIn.createdAt.getTime())
		expect(new Date(Math.min(...times)).toISOString()).toBe(
			"2026-03-17T12:04:00.000Z",
		)
		expect(new Date(Math.max(...times)).toISOString()).toBe(
			"2026-06-13T12:40:00.000Z",
		)
		expect(
			data.checkIns.every((checkIn) =>
				data.users.some((user) => user.id === checkIn.userId),
			),
		).toBe(true)
		expect(
			data.checkIns.every((checkIn) =>
				data.gyms.some((gym) => gym.id === checkIn.gymId),
			),
		).toBe(true)
	})

	it("FR-018: is deterministic, so a second run produces the same ids", () => {
		const first = build()
		const second = build()

		expect(second.users.map((user) => user.id)).toEqual(
			first.users.map((user) => user.id),
		)
		expect(second.gyms.map((gym) => gym.id)).toEqual(
			first.gyms.map((gym) => gym.id),
		)
		expect(second.checkIns.map((checkIn) => checkIn.id)).toEqual(
			first.checkIns.map((checkIn) => checkIn.id),
		)
	})
})
