/**
 * US-001 — Acceptance test: container principal de /admin/usuarios
 * deve ter max-w-3xl, igual ao container de /check-ins.
 *
 * RF-001: largura máxima equivalente à página /check-ins, com padding responsivo.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, test } from "vitest"

const FRONTEND_SRC = path.resolve(
	__dirname,
	"../../../../../../apps/frontend/src",
)

describe("US-001 — largura da página /admin/usuarios", () => {
	test("RF-001: section[data-testid=admin-users-page] possui classe max-w-3xl", () => {
		const src = readFileSync(
			path.join(FRONTEND_SRC, "app/(authenticated)/admin/usuarios/page.tsx"),
			"utf-8",
		)
		expect(src).toContain('data-testid="admin-users-page"')
		expect(src).toContain("max-w-3xl")
	})

	test("RF-001: /check-ins page também usa max-w-3xl (referência de largura)", () => {
		const src = readFileSync(
			path.join(FRONTEND_SRC, "app/(authenticated)/check-ins/page.tsx"),
			"utf-8",
		)
		expect(src).toContain("max-w-3xl")
	})

	test("RF-001: ambas as páginas usam o mesmo padrão de padding horizontal responsivo (px-4 py-10 sm:px-6)", () => {
		const adminSrc = readFileSync(
			path.join(FRONTEND_SRC, "app/(authenticated)/admin/usuarios/page.tsx"),
			"utf-8",
		)
		const checkInsSrc = readFileSync(
			path.join(FRONTEND_SRC, "app/(authenticated)/check-ins/page.tsx"),
			"utf-8",
		)
		const LAYOUT_PATTERN = "mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		expect(adminSrc).toContain(LAYOUT_PATTERN)
		expect(checkInsSrc).toContain(LAYOUT_PATTERN)
	})
})
