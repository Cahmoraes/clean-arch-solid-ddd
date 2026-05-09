import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { makeTestJwt } from "@/test/render"
import { useLogin, useLoginWithGoogle } from "./index"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useLogin", () => {
	it("popula o auth-store com token decodificado ao receber sucesso do MSW", async () => {
		const token = makeTestJwt({ sub: "user-42", role: "ADMIN" })
		server.use(
			http.post(`${apiBaseUrl}/sessions`, () =>
				HttpResponse.json(
					{ token, refreshToken: "refresh-stub" },
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })
		await result.current.mutateAsync({
			email: "user@example.com",
			password: "secret123",
		})

		await waitFor(() => {
			const state = useAuthStore.getState()
			expect(state.accessToken).toBe(token)
			expect(state.user).toEqual({ id: "user-42", role: "ADMIN" })
		})
	})

	it("propaga ApiError quando backend retorna 401", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions`, () =>
				HttpResponse.json({ message: "invalid" }, { status: 401 }),
			),
		)
		const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })

		await expect(
			result.current.mutateAsync({
				email: "user@example.com",
				password: "wrongpass",
			}),
		).rejects.toMatchObject({ status: 401 })
		expect(useAuthStore.getState().accessToken).toBeNull()
	})
})

describe("useLoginWithGoogle", () => {
	it("deve popular o auth-store com token ao autenticar via Google", async () => {
		const token = makeTestJwt({ sub: "google-user-1", role: "MEMBER" })
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json(
					{ token, refreshToken: "google-refresh-stub" },
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useLoginWithGoogle(), {
			wrapper: wrapper(),
		})
		await result.current.mutateAsync("fake-id-token")

		await waitFor(() => {
			expect(useAuthStore.getState().accessToken).toBe(token)
		})
	})

	it("deve lançar ApiError 401 quando token Google for inválido", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json({ message: "invalid token" }, { status: 401 }),
			),
		)

		const { result } = renderHook(() => useLoginWithGoogle(), {
			wrapper: wrapper(),
		})

		await expect(result.current.mutateAsync("bad-token")).rejects.toMatchObject(
			{
				status: 401,
			},
		)
		expect(useAuthStore.getState().accessToken).toBeNull()
	})

	it("deve lançar ApiError 422 quando email Google não estiver verificado", async () => {
		server.use(
			http.post(`${apiBaseUrl}/sessions/google`, () =>
				HttpResponse.json({ message: "email not verified" }, { status: 422 }),
			),
		)

		const { result } = renderHook(() => useLoginWithGoogle(), {
			wrapper: wrapper(),
		})

		await expect(
			result.current.mutateAsync("unverified-token"),
		).rejects.toMatchObject({ status: 422 })
	})
})
