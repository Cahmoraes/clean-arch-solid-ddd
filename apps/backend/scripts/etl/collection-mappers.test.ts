import { describe, expect, it } from "vitest"
import { Prisma } from "@/shared/infra/database/generated/prisma/client"
import { mapCheckIn, mapGym, mapUserActivityEvent } from "./collection-mappers"

const NOW = new Date("2026-03-11T02:30:00.000Z")

describe("collection mappers", () => {
	it("INV-08: mapGym keeps the id, converts Decimal coordinates to numbers without losing digits and derives location", () => {
		const document = mapGym({
			id: "gym-1",
			cnpj: "11222333000181",
			title: "Gym",
			description: null,
			phone: null,
			address: null,
			image_key: null,
			latitude: new Prisma.Decimal("-23.550520123456"),
			longitude: new Prisma.Decimal("-46.633308"),
			status: "activated",
			operating_hours: [
				{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] },
			],
			created_at: NOW,
			updated_at: NOW,
		})

		expect(document._id).toBe("gym-1")
		expect(document.latitude).toBe(-23.550520123456)
		expect(document.longitude).toBe(-46.633308)
		expect(typeof document.latitude).toBe("number")
		expect(document.location).toEqual({
			type: "Point",
			coordinates: [-46.633308, -23.550520123456],
		})
		expect(document.operating_hours).toEqual([
			{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] },
		])
	})

	it("INV-08: mapGym keeps a missing operating_hours as null", () => {
		const document = mapGym({
			id: "gym-2",
			cnpj: "11222333000182",
			title: "Gym",
			description: null,
			phone: null,
			address: null,
			image_key: null,
			latitude: new Prisma.Decimal("1"),
			longitude: new Prisma.Decimal("2"),
			status: "deactivated",
			operating_hours: null,
			created_at: NOW,
			updated_at: NOW,
		})

		expect(document.operating_hours).toBeNull()
	})

	it("mapCheckIn derives dayKey as the UTC date of created_at", () => {
		const document = mapCheckIn({
			id: "check-in-1",
			created_at: NOW,
			validated_at: null,
			rejected_at: null,
			latitude: new Prisma.Decimal("-23.5505"),
			longitude: new Prisma.Decimal("-46.6333"),
			user_id: "user-1",
			gym_id: "gym-1",
			updated_at: NOW,
		})

		expect(document.dayKey).toBe("2026-03-11")
		expect(document.latitude).toBe(-23.5505)
		expect(document.validated_at).toBeNull()
	})

	it("mapUserActivityEvent keeps a JSON object and fails loudly for any other JSON value", () => {
		const base = {
			id: "event-1",
			userId: "user-1",
			type: "LOGIN",
			description: "Login",
			occurredAt: NOW,
			createdAt: NOW,
		}

		expect(
			mapUserActivityEvent({ ...base, metadata: { ip: "127.0.0.1" } }).metadata,
		).toEqual({
			ip: "127.0.0.1",
		})
		expect(
			mapUserActivityEvent({ ...base, metadata: null }).metadata,
		).toBeNull()
		expect(() => mapUserActivityEvent({ ...base, metadata: ["x"] })).toThrow(
			"event-1",
		)
	})
})
