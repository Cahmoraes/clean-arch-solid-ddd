import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { makeTestJwt } from "@/test/render"
import { useLogin } from "./index"

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
