import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

// Exceções justificadas: WebGL do globo, seletores de saída do Recharts e o
// logo G oficial (asset de marca do Google — as 4 cores não são tokens do tema).
const ALLOWED_LITERAL_FILES: ReadonlyArray<string> = [
	"features/weather/components/weather-globe.tsx",
	"features/weather/components/weather-globe-constants.ts",
	"components/ui/chart.tsx",
	"components/ui/google-g-icon.tsx",
]

const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/

function offendingLines(content: string): number[] {
	return content
		.split("\n")
		.flatMap((line, index) => (LITERAL_COLOR.test(line) ? [index + 1] : []))
}

const files = listSourceFiles([".ts", ".tsx"])

describe("Cores literais em código de produção", () => {
	test("nenhum arquivo fora da lista de exceções contém hex ou rgb(a) literal", () => {
		const violations = files
			.filter((file) => !ALLOWED_LITERAL_FILES.includes(file.path))
			.flatMap((file) =>
				offendingLines(file.content).map((line) => `${file.path}:${line}`),
			)
		expect(violations).toEqual([])
	})

	test("cada exceção da lista existe e ainda precisa da exceção", () => {
		for (const allowed of ALLOWED_LITERAL_FILES) {
			const file = files.find((candidate) => candidate.path === allowed)
			expect(file, `${allowed} não existe mais`).toBeDefined()
			expect(
				offendingLines(file?.content ?? "").length,
				`${allowed} não tem mais literal: remova da lista`,
			).toBeGreaterThan(0)
		}
	})
})
