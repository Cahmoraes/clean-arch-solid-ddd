import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useMyCheckInStats } from "./use-my-check-in-stats"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return { Wrapper, queryClient }
}

describe("useMyCheckInStats", () => {
	test("retorna estatísticas do usuário autenticado com sucesso", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins/me/stats`, () =>
				HttpResponse.json(
					{ total: 10, validated: 8, pending: 1, rejected: 1 },
					{ status: 200 },
				),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useMyCheckInStats(), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual({
			total: 10,
			validated: 8,
			pending: 1,
			rejected: 1,
		})
	})

	test("propaga ApiError quando backend retorna 401", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins/me/stats`, () =>
				HttpResponse.json({ message: "unauthorized" }, { status: 401 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useMyCheckInStats(), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error?.status).toBe(401)
	})

	test("usa queryKey correta ['my-check-in-stats']", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins/me/stats`, () =>
				HttpResponse.json(
					{ total: 5, validated: 4, pending: 1, rejected: 0 },
					{ status: 200 },
				),
			),
		)
		const { Wrapper, queryClient } = makeWrapper()
		const { result } = renderHook(() => useMyCheckInStats(), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		const cached = queryClient.getQueryData(["my-check-in-stats"])
		expect(cached).toEqual({ total: 5, validated: 4, pending: 1, rejected: 0 })
	})
})
