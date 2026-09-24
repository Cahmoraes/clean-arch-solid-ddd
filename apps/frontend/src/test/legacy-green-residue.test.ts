import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

// O globo 3D do clima (WebGL) mantém a cor da marca antiga como valor literal;
// exceção registrada e justificada na task-04.
const ALLOWED_FILES: ReadonlyArray<string> = [
	"features/weather/components/weather-globe.tsx",
	"features/weather/components/weather-globe-constants.ts",
]

// Verde VOLT antigo: acento #39e58c, primary-strong #22c976 e o rgba equivalente.
const LEGACY_GREEN = /#39e58c|#22c976|rgba?\(\s*57\s*,\s*229\s*,\s*140/i

describe("Resíduo do verde VOLT antigo e escopo da arte", () => {
	test("nenhum arquivo de produção (ts, tsx, css) fora do globo 3D usa o verde antigo", () => {
		const violations = listSourceFiles([".ts", ".tsx", ".css"])
			.filter((file) => !ALLOWED_FILES.includes(file.path))
			.filter((file) => LEGACY_GREEN.test(file.content))
			.map((file) => file.path)
		expect(violations).toEqual([])
	})

	test("PixelScene só aparece nas superfícies de destaque (login, hero, estado vazio, capa de academia)", () => {
		const SCENE_SURFACES = [
			"app/(public)/login/page.tsx",
			"components/ui/empty-state.tsx",
			"features/dashboard/components/profile-hero-card.tsx",
			"features/gyms/components/gym-image.tsx",
		]
		const users = listSourceFiles([".tsx"])
			.filter(
				(file) =>
					file.path !== "components/ui/pixel-scene.tsx" &&
					/<PixelScene\b/.test(file.content),
			)
			.map((file) => file.path)
			.sort()
		expect(users).toEqual(SCENE_SURFACES)
	})

	test("as exceções do globo ainda precisam da exceção", () => {
		const files = listSourceFiles([".ts", ".tsx"])
		for (const allowed of ALLOWED_FILES) {
			const file = files.find((candidate) => candidate.path === allowed)
			expect(file, `${allowed} não existe mais`).toBeDefined()
			expect(
				LEGACY_GREEN.test(file?.content ?? ""),
				`${allowed} não usa mais o verde antigo: remova da lista`,
			).toBe(true)
		}
	})
})
