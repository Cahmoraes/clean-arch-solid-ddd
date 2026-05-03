import { afterEach, describe, expect, it, vi } from "vitest"
import { authEvents, useAuthStore } from "./auth-store"

function makeJwt(payload: Record<string, unknown>): string {
	const part = (obj: unknown) =>
		Buffer.from(JSON.stringify(obj))
			.toString("base64")
			.replace(/=+$/, "")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
	return `${part({ alg: "HS256" })}.${part(payload)}.sig`
}

describe("useAuthStore", () => {
	it("starts with empty session", () => {
		const state = useAuthStore.getState()
		expect(state.accessToken).toBeNull()
		expect(state.user).toBeNull()
		expect(state.expiresAt).toBeNull()
	})

	it("setSession decodes JWT and stores token, claims and expiration", () => {
		const exp = Math.floor(Date.now() / 1000) + 1200
		const token = makeJwt({ sub: "user-42", role: "ADMIN", exp })

		useAuthStore.getState().setSession(token)

		const state = useAuthStore.getState()
		expect(state.accessToken).toBe(token)
		expect(state.user).toEqual({ id: "user-42", role: "ADMIN" })
		expect(state.expiresAt).toBe(exp * 1000)
	})

	it("clear resets state", () => {
		useAuthStore.setState({
			accessToken: "x",
			expiresAt: 1,
			user: { id: "u", role: "MEMBER" },
		})

		useAuthStore.getState().clear()

		const state = useAuthStore.getState()
		expect(state.accessToken).toBeNull()
		expect(state.expiresAt).toBeNull()
		expect(state.user).toBeNull()
	})

	it("emits 'login' event when setSession is called with default kind", () => {
		const exp = Math.floor(Date.now() / 1000) + 60
		const token = makeJwt({ sub: "u-1", role: "MEMBER", exp })
		const handler = vi.fn()
		authEvents.addEventListener("login", handler)

		useAuthStore.getState().setSession(token)

		expect(handler).toHaveBeenCalledOnce()
		const event = handler.mock.calls[0][0] as CustomEvent<{
			user: { id: string; role: string } | null
		}>
		expect(event.detail.user).toEqual({ id: "u-1", role: "MEMBER" })
		authEvents.removeEventListener("login", handler)
	})

	it("emits 'refresh' event when setSession is called with kind=refresh", () => {
		const token = makeJwt({
			sub: "u-1",
			role: "MEMBER",
			exp: Math.floor(Date.now() / 1000) + 60,
		})
		const handler = vi.fn()
		authEvents.addEventListener("refresh", handler)

		useAuthStore.getState().setSession(token, "refresh")

		expect(handler).toHaveBeenCalledOnce()
		authEvents.removeEventListener("refresh", handler)
	})

	it("emits 'logout' event when clear is called with default kind", () => {
		const handler = vi.fn()
		authEvents.addEventListener("logout", handler)

		useAuthStore.getState().clear()

		expect(handler).toHaveBeenCalledOnce()
		authEvents.removeEventListener("logout", handler)
	})

	it("emits 'forced-logout' event when clear is called with kind=forced-logout", () => {
		const handler = vi.fn()
		authEvents.addEventListener("forced-logout", handler)

		useAuthStore.getState().clear("forced-logout")

		expect(handler).toHaveBeenCalledOnce()
		authEvents.removeEventListener("forced-logout", handler)
	})
})

describe("writeSessionFlag via document.cookie", () => {
	afterEach(() => {
		// Limpa o cookie has_session entre testes via store (que usa document.cookie internamente)
		useAuthStore.getState().clear()
	})

	it("escreve has_session=1 ao chamar setSession com JWT válido", () => {
		const exp = Math.floor(Date.now() / 1000) + 60
		const token = makeJwt({ sub: "u", role: "MEMBER", exp })

		useAuthStore.getState().setSession(token)

		expect(document.cookie).toContain("has_session=1")
	})

	it("remove has_session ao chamar clear", () => {
		const exp = Math.floor(Date.now() / 1000) + 60
		const token = makeJwt({ sub: "u", role: "MEMBER", exp })
		useAuthStore.getState().setSession(token) // escreve has_session=1 internamente

		useAuthStore.getState().clear()

		expect(document.cookie).not.toContain("has_session=1")
	})

	it("não escreve has_session ao chamar setSession com JWT inválido", () => {
		useAuthStore.getState().setSession("token-invalido-sem-payload")

		expect(document.cookie).not.toContain("has_session=1")
	})
})
