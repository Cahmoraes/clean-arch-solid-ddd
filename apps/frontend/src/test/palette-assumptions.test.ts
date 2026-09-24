import { describe, expect, test } from "vitest"
import { listSourceFiles } from "./source-files"

// Idiomas do verde antigo, quando accent e primary eram o mesmo verde.
// Com accent ciano e primary magenta, cada um muda de significado.
const FORBIDDEN_IDIOMS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
	{
		name: "alerta de erro pintado com accent",
		pattern: /border border-border bg-accent px-4 py-/,
	},
	{
		name: "banner de aviso pintado com accent",
		pattern: /border-primary bg-accent px-4 py-3/,
	},
	{
		name: "CTA com fundo accent e hover primary-strong",
		pattern: /bg-accent[^"'`]*hover:bg-primary-strong/,
	},
	{
		name: "texto de página em accent-foreground",
		pattern: /text-accent-foreground\/70/,
	},
]

describe("Premissas do verde antigo", () => {
	test("nenhum arquivo de produção usa accent com o significado do verde antigo", () => {
		const violations = listSourceFiles([".ts", ".tsx"]).flatMap((file) =>
			FORBIDDEN_IDIOMS.filter(({ pattern }) => pattern.test(file.content)).map(
				({ name }) => `${file.path}: ${name}`,
			),
		)
		expect(violations).toEqual([])
	})
})
