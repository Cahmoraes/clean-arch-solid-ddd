import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { useMe, useMetrics, useUserById } from "./index"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper(): (props: { children: ReactNode }) => React.JSX.Element {
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

describe("useMe", () => {
	it("retorna dados tipados a partir do MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me`, () =>
				HttpResponse.json(
					{ id: "u-1", name: "Alice", email: "alice@example.com" },
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() })

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(result.current.data).toEqual({
			id: "u-1",
			name: "Alice",
			email: "alice@example.com",
		})
	})

	it("propaga ApiError em 401", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me`, () =>
				HttpResponse.json({}, { status: 401 }),
			),
		)
		const { result } = renderHook(() => useMe(), { wrapper: makeWrapper() })
		await waitFor(() => {
			expect(result.current.isError).toBe(true)
		})
		expect(result.current.error?.status).toBe(401)
	})
})

describe("useMetrics", () => {
	it("retorna métricas tipadas do MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me/metrics`, () =>
				HttpResponse.json({ checkInsCount: 7 }, { status: 200 }),
			),
		)
		const { result } = renderHook(() => useMetrics(), {
			wrapper: makeWrapper(),
		})
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(result.current.data?.checkInsCount).toBe(7)
	})
})

describe("useUserById", () => {
	it("não dispara request quando userId é vazio", () => {
		const { result } = renderHook(() => useUserById(undefined), {
			wrapper: makeWrapper(),
		})
		expect(result.current.fetchStatus).toBe("idle")
	})

	it("retorna perfil público a partir do MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId`, ({ params }) =>
				HttpResponse.json(
					{
						id: params.userId,
						name: "Bob",
						email: "bob@example.com",
						role: "MEMBER",
					},
					{ status: 200 },
				),
			),
		)
		const { result } = renderHook(() => useUserById("user-42"), {
			wrapper: makeWrapper(),
		})
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(result.current.data).toMatchObject({
			id: "user-42",
			name: "Bob",
			email: "bob@example.com",
			role: "MEMBER",
		})
	})
})
