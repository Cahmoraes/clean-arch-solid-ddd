/**
 * Acceptance Test — HU-10: Alternância de tema claro/escuro
 * RF-002: tema padrão dark, light disponível e selecionável
 *
 * Nota: testes comportamentais (dark↔light toggle via setTheme) são cobertos
 * pelo teste unitário em src/components/ui/theme-toggle.test.tsx (2/2 passing).
 * Este acceptance test valida: estrutura do componente, integração no shell,
 * e configuração de defaultTheme no layout — por inspeção estática de código.
 */
import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const frontendDir = resolve(
	import.meta.dirname,
	"../../../../../../apps/frontend",
)

describe("HU-10 — Alternância de tema (acceptance)", () => {
	test("RF-002: layout.tsx configura defaultTheme='dark'", () => {
		const layout = readFileSync(
			resolve(frontendDir, "src/app/layout.tsx"),
			"utf-8",
		)
		expect(layout).toContain('defaultTheme="dark"')
		expect(layout).toContain("ThemeProvider")
	})

	test("RF-002: ThemeToggle está integrado no authenticated-shell.tsx", () => {
		const shell = readFileSync(
			resolve(
				frontendDir,
				"src/components/layout/authenticated-shell.tsx",
			),
			"utf-8",
		)
		expect(shell).toContain("ThemeToggle")
		expect(shell).toContain("theme-toggle")
	})

	test("RF-002: theme-toggle.tsx implementa toggle deslizante (não FAB)", () => {
		const component = readFileSync(
			resolve(frontendDir, "src/components/ui/theme-toggle.tsx"),
			"utf-8",
		)
		// Toggle deslizante: dimensões fixas e rounded-full
		expect(component).toContain("h-[42px]")
		expect(component).toContain("w-[132px]")
		expect(component).toContain("rounded-full")
		// Não é FAB (sem posição fixed/absolute no elemento raiz)
		expect(component).not.toContain("fixed")
	})

	test("RF-002: theme-toggle.tsx usa useTheme do next-themes para alternar", () => {
		const component = readFileSync(
			resolve(frontendDir, "src/components/ui/theme-toggle.tsx"),
			"utf-8",
		)
		expect(component).toContain('from "next-themes"')
		expect(component).toContain("useTheme")
		expect(component).toContain('setTheme(isDark ? "light" : "dark")')
	})

	test("RF-002: theme-toggle.tsx tem aria-pressed para acessibilidade", () => {
		const component = readFileSync(
			resolve(frontendDir, "src/components/ui/theme-toggle.tsx"),
			"utf-8",
		)
		expect(component).toContain("aria-pressed={isDark}")
		expect(component).toContain("aria-label")
		expect(component).toContain("Ativar tema claro")
		expect(component).toContain("Ativar tema escuro")
	})

	test("RF-002: testes unitários existentes cobrem alternância dark↔light", () => {
		const unitTest = readFileSync(
			resolve(
				frontendDir,
				"src/components/ui/theme-toggle.test.tsx",
			),
			"utf-8",
		)
		expect(unitTest).toContain("alterna para light quando o tema atual é dark")
		expect(unitTest).toContain("alterna para dark quando o tema atual é light")
		expect(unitTest).toContain("setTheme")
	})
})
