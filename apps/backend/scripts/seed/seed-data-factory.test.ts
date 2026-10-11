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

	it("FR-018: gives each member at most 8 check-ins on distinct UTC days within 90 days", () => {
		const data = build()

		const byUser = new Map<string, Date[]>()
		for (const checkIn of data.checkIns) {
			byUser.set(checkIn.userId, [
				...(byUser.get(checkIn.userId) ?? []),
				checkIn.createdAt,
			])
		}
		for (const dates of byUser.values()) {
			expect(dates.length).toBeLessThanOrEqual(8)
			const days = dates.map((date) => date.toISOString().slice(0, 10))
			expect(new Set(days).size).toBe(days.length)
		}
		const oldest = Math.min(
			...data.checkIns.map((checkIn) => checkIn.createdAt.getTime()),
		)
		expect(NOW.getTime() - oldest).toBeLessThanOrEqual(91 * 24 * 3_600_000)
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
