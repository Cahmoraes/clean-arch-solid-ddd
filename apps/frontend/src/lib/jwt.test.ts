import { describe, expect, it } from "vitest"
import { decodeJwt } from "./jwt"

function makeJwt(payload: Record<string, unknown>): string {
	const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
		.toString("base64")
		.replace(/=+$/, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
	const body = Buffer.from(JSON.stringify(payload))
		.toString("base64")
		.replace(/=+$/, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
	return `${header}.${body}.signature`
}

describe("decodeJwt", () => {
	it("decodes a valid token payload", () => {
		const exp = Math.floor(Date.now() / 1000) + 600
		const token = makeJwt({ sub: "user-1", role: "MEMBER", exp })
		expect(decodeJwt(token)).toEqual({ sub: "user-1", role: "MEMBER", exp })
	})

	it("returns null for malformed token", () => {
		expect(decodeJwt("not-a-token")).toBeNull()
		expect(decodeJwt("")).toBeNull()
	})

	it("returns null when payload is missing required claims", () => {
		const token = makeJwt({ sub: "x" })
		expect(decodeJwt(token)).toBeNull()
	})

	it("returns null when role is invalid", () => {
		const token = makeJwt({ sub: "x", role: "OTHER", exp: 1 })
		expect(decodeJwt(token)).toBeNull()
	})

	it("decodes a token with nested sub claim (backend format)", () => {
		const exp = Math.floor(Date.now() / 1000) + 600
		const token = makeJwt({
			sub: { id: "user-2", email: "x@y.com", role: "ADMIN", jwi: "j" },
			exp,
		})
		expect(decodeJwt(token)).toEqual({ sub: "user-2", role: "ADMIN", exp })
	})

	it("extrai isSuperAdmin true do sub aninhado", () => {
		const exp = Math.floor(Date.now() / 1000) + 600
		const token = makeJwt({
			sub: {
				id: "user-3",
				email: "sa@y.com",
				role: "ADMIN",
				isSuperAdmin: true,
				jwi: "j2",
			},
			exp,
		})
		const payload = decodeJwt(token)
		expect(payload?.isSuperAdmin).toBe(true)
	})

	it("extrai isSuperAdmin false do sub aninhado", () => {
		const exp = Math.floor(Date.now() / 1000) + 600
		const token = makeJwt({
			sub: {
				id: "user-4",
				email: "m@y.com",
				role: "MEMBER",
				isSuperAdmin: false,
				jwi: "j3",
			},
			exp,
		})
		const payload = decodeJwt(token)
		expect(payload?.isSuperAdmin).toBe(false)
	})

	it("isSuperAdmin é undefined quando ausente do sub", () => {
		const exp = Math.floor(Date.now() / 1000) + 600
		const token = makeJwt({
			sub: { id: "user-5", email: "m2@y.com", role: "MEMBER", jwi: "j4" },
			exp,
		})
		const payload = decodeJwt(token)
		expect(payload?.isSuperAdmin).toBeUndefined()
	})
})
