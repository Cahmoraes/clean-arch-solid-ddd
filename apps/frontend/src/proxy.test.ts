// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { proxy } from "./proxy"

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
	const url = `http://localhost:3000${pathname}`
	const cookieHeader = Object.entries(cookies)
		.map(([key, value]) => `${key}=${value}`)
		.join("; ")
	return new NextRequest(url, {
		headers: cookieHeader ? { cookie: cookieHeader } : undefined,
	})
}

describe("Edge proxy", () => {
	it("redirects unauthenticated requests to /login with redirect param", () => {
		const req = makeRequest("/perfil")
		const res = proxy(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.status).toBeLessThan(400)
		const location = res.headers.get("location")
		expect(location).toContain("/login")
		expect(location).toContain("redirect=%2Fperfil")
	})

	it("passes through when refreshToken cookie is present", () => {
		const req = makeRequest("/perfil", { refreshToken: "abc" })
		const res = proxy(req)

		expect(res.headers.get("location")).toBeNull()
		expect(res.status).toBe(200)
	})

	it("supports refresh_token cookie name fallback", () => {
		const req = makeRequest("/admin/usuarios", { refresh_token: "xyz" })
		const res = proxy(req)
		expect(res.headers.get("location")).toBeNull()
	})

	it("passes through quando has_session=1 está presente sem refresh cookie (fallback cross-port)", () => {
		const req = makeRequest("/academias", { has_session: "1" })
		const res = proxy(req)

		expect(res.headers.get("location")).toBeNull()
		expect(res.status).toBe(200)
	})

	it("redireciona quando has_session tem valor inválido e não há refresh cookie", () => {
		const req = makeRequest("/academias", { has_session: "true" })
		const res = proxy(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.headers.get("location")).toContain("/login")
	})

	it("redireciona quando has_session está ausente e não há refresh cookie", () => {
		const req = makeRequest("/check-ins")
		const res = proxy(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.headers.get("location")).toContain("/login")
	})
})
