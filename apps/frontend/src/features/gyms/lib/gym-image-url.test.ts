import { describe, expect, test } from "vitest"
import { API_BASE_URL } from "@/lib/api"
import { gymImageUrl } from "./gym-image-url"

describe("gymImageUrl", () => {
	test("retorna null quando imageKey é null/undefined/vazio", () => {
		expect(gymImageUrl(null)).toBeNull()
		expect(gymImageUrl(undefined)).toBeNull()
		expect(gymImageUrl("")).toBeNull()
	})

	test("monta a URL pública a partir da imageKey", () => {
		expect(gymImageUrl("gyms/abc.webp")).toBe(
			`${API_BASE_URL}/uploads/gyms/abc.webp`,
		)
	})
})
