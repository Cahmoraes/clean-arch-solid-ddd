// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, test } from "vitest"
import { config, proxy } from "./proxy"

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
	const url = `http://localhost:3000${pathname}`
	const cookieHeader = Object.entries(cookies)
		.map(([key, value]) => `${key}=${value}`)
		.join("; ")
	return new NextRequest(url, {
		headers: cookieHeader ? { cookie: cookieHeader } : undefined,
	})
}

describe("proxy de rotas autenticadas", () => {
	test("redireciona requisição sem refresh token para /login com redirect", () => {
		const req = makeRequest("/perfil")
		const res = proxy(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.status).toBeLessThan(400)
		const location = res.headers.get("location")
		expect(location).toContain("/login")
		expect(location).toContain("redirect=%2Fperfil")
	})

	test("permite requisição quando cookie refreshToken está presente", () => {
		const req = makeRequest("/perfil", { refreshToken: "abc" })
		const res = proxy(req)

		expect(res.headers.get("location")).toBeNull()
		expect(res.status).toBe(200)
	})

	test("aceita nome alternativo refresh_token", () => {
		const req = makeRequest("/admin/usuarios", { refresh_token: "xyz" })
		const res = proxy(req)
		expect(res.headers.get("location")).toBeNull()
	})

	test("redireciona quando só has_session=1 está presente sem refresh token", () => {
		const req = makeRequest("/academias", { has_session: "1" })
		const res = proxy(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.headers.get("location")).toContain("/login")
	})

	test("redireciona quando has_session tem valor inválido e não há refresh token", () => {
		const req = makeRequest("/academias", { has_session: "true" })
		const res = proxy(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.headers.get("location")).toContain("/login")
	})

	test("redireciona quando não há refresh token", () => {
		const req = makeRequest("/check-ins")
		const res = proxy(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.headers.get("location")).toContain("/login")
	})

	test("redireciona /inicio para /login quando não autenticado (RF-003)", () => {
		const req = makeRequest("/inicio")
		const res = proxy(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.headers.get("location")).toContain("/login")
		expect(res.headers.get("location")).toContain("redirect=%2Finicio")
	})

	test("passa em /inicio quando autenticado (RF-003)", () => {
		const req = makeRequest("/inicio", { refreshToken: "abc" })
		const res = proxy(req)

		expect(res.headers.get("location")).toBeNull()
		expect(res.status).toBe(200)
	})

	test("protege /calendario pelo matcher e redireciona quando não autenticado", () => {
		const req = makeRequest("/calendario")
		const res = proxy(req)

		expect(config.matcher).toContain("/calendario/:path*")
		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.headers.get("location")).toContain("/login")
		expect(res.headers.get("location")).toContain("redirect=%2Fcalendario")
	})

	test("bloqueia bypass de /calendario com has_session client-side", () => {
		const req = makeRequest("/calendario", { has_session: "1" })
		const res = proxy(req)

		expect(config.matcher).toContain("/calendario/:path*")
		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.headers.get("location")).toContain("/login")
		expect(res.headers.get("location")).toContain("redirect=%2Fcalendario")
	})

	test("passa em /calendario quando autenticado", () => {
		const req = makeRequest("/calendario", { refreshToken: "abc" })
		const res = proxy(req)

		expect(config.matcher).toContain("/calendario/:path*")
		expect(res.headers.get("location")).toBeNull()
		expect(res.status).toBe(200)
	})
})
