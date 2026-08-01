import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { resolveLocation } from "./resolve-location"

const baseGym: Gym = {
	id: "g1",
	title: "VOLT Centro",
	description: null,
	phone: null,
	address: null,
	imageKey: null,
	latitude: -23.5,
	longitude: -46.6,
	status: "activated",
}

describe("resolveLocation", () => {
	test("retorna o endereço quando presente", () => {
		const gym: Gym = { ...baseGym, address: "Rua A, 100" }
		expect(resolveLocation(gym)).toBe("Rua A, 100")
	})

	test("retorna as coordenadas formatadas quando o endereço está ausente", () => {
		const gym: Gym = { ...baseGym, address: null }
		expect(resolveLocation(gym)).toBe("-23.5000, -46.6000")
	})
})
