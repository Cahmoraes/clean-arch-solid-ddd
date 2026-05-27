import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useUserStats } from "./use-user-stats"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useUserStats", () => {
	test("deve retornar os contadores de usuários do endpoint", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/stats`, () =>
				HttpResponse.json(
					{
						total: 50,
						members: 43,
						admins: 7,
						active: 48,
						inactive: 2,
					},
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useUserStats(), { wrapper: wrapper() })

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual({
			total: 50,
			members: 43,
			admins: 7,
			active: 48,
			inactive: 2,
		})
	})

	test("deve entrar em estado de erro quando o endpoint retorna 403", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/stats`, () =>
				HttpResponse.json({ message: "Forbidden" }, { status: 403 }),
			),
		)

		const { result } = renderHook(() => useUserStats(), { wrapper: wrapper() })

		await waitFor(() => expect(result.current.isError).toBe(true))
	})
})
