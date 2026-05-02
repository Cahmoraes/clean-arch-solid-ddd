import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { middleware } from "./middleware"

function makeRequest(pathname: string, cookies: Record<string, string> = {}) {
	const url = `http://localhost:3000${pathname}`
	const cookieHeader = Object.entries(cookies)
		.map(([key, value]) => `${key}=${value}`)
		.join("; ")
	return new NextRequest(url, {
		headers: cookieHeader ? { cookie: cookieHeader } : undefined,
	})
}

describe("Edge middleware", () => {
	it("redirects unauthenticated requests to /login with redirect param", () => {
		const req = makeRequest("/perfil")
		const res = middleware(req)

		expect(res.status).toBeGreaterThanOrEqual(300)
		expect(res.status).toBeLessThan(400)
		const location = res.headers.get("location")
		expect(location).toContain("/login")
		expect(location).toContain("redirect=%2Fperfil")
	})

	it("passes through when refreshToken cookie is present", () => {
		const req = makeRequest("/perfil", { refreshToken: "abc" })
		const res = middleware(req)

		expect(res.headers.get("location")).toBeNull()
		expect(res.status).toBe(200)
	})

	it("supports refresh_token cookie name fallback", () => {
		const req = makeRequest("/admin/usuarios", { refresh_token: "xyz" })
		const res = middleware(req)
		expect(res.headers.get("location")).toBeNull()
	})
})
