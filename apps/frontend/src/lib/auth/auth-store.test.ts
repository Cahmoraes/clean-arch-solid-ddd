import { describe, expect, test, vi } from "vitest"
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
	test("inicia sem sessão", () => {
		const state = useAuthStore.getState()
		expect(state.accessToken).toBeNull()
		expect(state.user).toBeNull()
		expect(state.expiresAt).toBeNull()
	})

	test("setSession decodifica JWT e armazena token, claims e expiração", () => {
		const exp = Math.floor(Date.now() / 1000) + 1200
		const token = makeJwt({ sub: "user-42", role: "ADMIN", exp })

		useAuthStore.getState().setSession(token)

		const state = useAuthStore.getState()
		expect(state.accessToken).toBe(token)
		expect(state.user).toEqual({ id: "user-42", role: "ADMIN" })
		expect(state.expiresAt).toBe(exp * 1000)
	})

	test("clear limpa o estado", () => {
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

	test("emite evento login quando setSession é chamado com kind padrão", () => {
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

	test("emite evento refresh quando setSession é chamado com kind refresh", () => {
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

	test("emite evento logout quando clear é chamado com kind padrão", () => {
		const handler = vi.fn()
		authEvents.addEventListener("logout", handler)

		useAuthStore.getState().clear()

		expect(handler).toHaveBeenCalledOnce()
		authEvents.removeEventListener("logout", handler)
	})

	test("emite evento forced-logout quando clear é chamado com kind forced-logout", () => {
		const handler = vi.fn()
		authEvents.addEventListener("forced-logout", handler)

		useAuthStore.getState().clear("forced-logout")

		expect(handler).toHaveBeenCalledOnce()
		authEvents.removeEventListener("forced-logout", handler)
	})
})
