import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useAdminCheckInStats } from "./use-admin-check-in-stats"

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

describe("useAdminCheckInStats", () => {
	test("retorna estatísticas globais de check-ins com sucesso", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins/stats`, () =>
				HttpResponse.json(
					{ total: 200, validated: 150, pending: 30, rejected: 20 },
					{ status: 200 },
				),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useAdminCheckInStats(), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual({
			total: 200,
			validated: 150,
			pending: 30,
			rejected: 20,
		})
	})

	test("propaga ApiError quando backend retorna 403", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins/stats`, () =>
				HttpResponse.json({ message: "forbidden" }, { status: 403 }),
			),
		)
		const { Wrapper } = makeWrapper()
		const { result } = renderHook(() => useAdminCheckInStats(), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error?.status).toBe(403)
	})

	test("usa queryKey correta ['admin-check-in-stats']", async () => {
		server.use(
			http.get(`${apiBaseUrl}/check-ins/stats`, () =>
				HttpResponse.json(
					{ total: 50, validated: 40, pending: 5, rejected: 5 },
					{ status: 200 },
				),
			),
		)
		const { Wrapper, queryClient } = makeWrapper()
		const { result } = renderHook(() => useAdminCheckInStats(), {
			wrapper: Wrapper,
		})
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		const cached = queryClient.getQueryData(["admin-check-in-stats"])
		expect(cached).toEqual({
			total: 50,
			validated: 40,
			pending: 5,
			rejected: 5,
		})
	})
})
