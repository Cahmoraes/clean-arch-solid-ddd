import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { resolveGymStatusBadge } from "./resolve-status-badge"

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

describe("resolveGymStatusBadge", () => {
	test("retorna tone danger e label Desativada quando desativada com adminEditHref", () => {
		const gym: Gym = { ...baseGym, status: "deactivated" }
		expect(resolveGymStatusBadge(gym, "/admin/academias/g1")).toEqual({
			tone: "danger",
			label: "Desativada",
		})
	})

	test("retorna tone success e label Disponível quando desativada sem adminEditHref", () => {
		const gym: Gym = { ...baseGym, status: "deactivated" }
		expect(resolveGymStatusBadge(gym, undefined)).toEqual({
			tone: "success",
			label: "Disponível",
		})
	})

	test("retorna tone success e label Disponível quando ativada com adminEditHref", () => {
		const gym: Gym = { ...baseGym, status: "activated" }
		expect(resolveGymStatusBadge(gym, "/admin/academias/g1")).toEqual({
			tone: "success",
			label: "Disponível",
		})
	})
})
