import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

describe("crt-scanlines só aparece nas 4 superfícies de destaque", () => {
	test("nenhum outro arquivo .tsx usa a classe crt-scanlines", () => {
		const SCANLINE_SURFACES = [
			"components/layout/authenticated-shell.tsx",
			"components/ui/pixel-scene.tsx",
			"features/dashboard/components/kpi-cards.tsx",
			"features/dashboard/components/profile-hero-card.tsx",
		]
		const users = listSourceFiles([".tsx"])
			.filter((file) => !file.path.includes(".test."))
			.filter((file) => /crt-scanlines/.test(file.content))
			.map((file) => file.path)
			.sort()
		expect(users).toEqual(SCANLINE_SURFACES)
	})
})
