/**
 * Acceptance test — US-01: Tela inicial personalizada
 *
 * Verifica via inspeção estática de arquivos que:
 * - RF-001: a rota `/inicio` existe no grupo autenticado
 * - RF-002: após login, o redirecionamento padrão aponta para `/inicio`
 * - RF-003: a rota `/inicio` está protegida pelo middleware de sessão (proxy)
 *
 * Estes testes operam sobre o sistema de arquivos e os artefatos de código-fonte,
 * sem precisar de um servidor em execução.
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { describe, expect, test } from "vitest"

const frontendRoot = path.resolve(__dirname, "../../../../../apps/frontend/src")

describe("US-01 — Tela inicial personalizada", () => {
	// RF-001: a rota /inicio deve existir no grupo autenticado
	test("RF-001: page.tsx existe em (authenticated)/inicio/", () => {
		const pagePath = path.join(
			frontendRoot,
			"app",
			"(authenticated)",
			"inicio",
			"page.tsx",
		)
		expect(
			fs.existsSync(pagePath),
			`Rota /inicio não encontrada em ${pagePath}`,
		).toBe(true)
	})

	// RF-002: após login, DEFAULT_REDIRECT deve apontar para /inicio
	test("RF-002: login page define DEFAULT_REDIRECT = '/inicio'", () => {
		const loginPagePath = path.join(
			frontendRoot,
			"app",
			"(public)",
			"login",
			"page.tsx",
		)
		expect(
			fs.existsSync(loginPagePath),
			`Login page não encontrada em ${loginPagePath}`,
		).toBe(true)

		const content = fs.readFileSync(loginPagePath, "utf-8")
		expect(
			content,
			"DEFAULT_REDIRECT deve ser '/inicio' na página de login",
		).toMatch(/DEFAULT_REDIRECT\s*=\s*["'`]\/inicio["'`]/)
	})

	// RF-003: /inicio deve estar no matcher do middleware de sessão
	test("RF-003: /inicio está incluído no matcher do proxy (middleware de sessão)", () => {
		const proxyPath = path.join(frontendRoot, "proxy.ts")
		expect(
			fs.existsSync(proxyPath),
			`Arquivo de middleware não encontrado em ${proxyPath}`,
		).toBe(true)

		const content = fs.readFileSync(proxyPath, "utf-8")
		expect(
			content,
			"O middleware (proxy.ts) deve incluir '/inicio' no config.matcher para proteger a rota",
		).toMatch(/["'`]\/inicio/)
	})
})
