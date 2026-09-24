import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

const ALLOWED_FILES: ReadonlyArray<string> = [
	"features/weather/components/weather-globe.tsx",
	"features/weather/components/weather-globe-fallback.tsx",
]

const ROUNDED_RESIDUE = /\brounded-(full|\[|2xl|3xl)|\brounded(?![-\w])/

describe("nenhum resíduo de arredondamento ou corner-shape fora dos tokens", () => {
	test("nenhum arquivo de produção fora da allowlist usa rounded-full, rounded-[, rounded-2xl, rounded-3xl ou rounded bare", () => {
		const violations = listSourceFiles([".ts", ".tsx"])
			.filter((file) => !file.path.includes(".test."))
			.filter((file) => !ALLOWED_FILES.includes(file.path))
			.filter((file) => ROUNDED_RESIDUE.test(file.content))
			.map((file) => file.path)
		expect(violations).toEqual([])
	})

	test("nenhum arquivo além de app/globals.css declara corner-shape", () => {
		const violations = listSourceFiles([".ts", ".tsx", ".css"])
			.filter((file) => !file.path.includes(".test."))
			.filter((file) => file.path !== "app/globals.css")
			.filter((file) => file.content.includes("corner-shape"))
			.map((file) => file.path)
		expect(violations).toEqual([])
	})

	test("a allowlist do globo do clima ainda precisa da exceção", () => {
		const stillViolating = listSourceFiles([".ts", ".tsx"])
			.filter((file) => ALLOWED_FILES.includes(file.path))
			.filter((file) => ROUNDED_RESIDUE.test(file.content))
			.map((file) => file.path)
		expect(stillViolating.sort()).toEqual([...ALLOWED_FILES].sort())
	})
	test("o globo do clima anula o chanfro global com corner-round, senão rounded-full vira losango", () => {
		const missing = listSourceFiles([".tsx"])
			.filter((file) => ALLOWED_FILES.includes(file.path))
			.filter((file) => !/\bcorner-round\b/.test(file.content))
			.map((file) => file.path)
		expect(missing).toEqual([])
	})

	test("o corner-shape: bevel global fica em @layer base, senão utilities como corner-round não o sobrescrevem", () => {
		const css = listSourceFiles([".css"]).find(
			(file) => file.path === "app/globals.css",
		)
		expect(css?.content).toMatch(
			/@layer base\s*\{\s*\*,\s*::before,\s*::after\s*\{\s*corner-shape:\s*bevel/,
		)
	})
})
