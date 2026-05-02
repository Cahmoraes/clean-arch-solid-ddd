import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { useUsers } from "./useUsers"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function wrapper(): (props: { children: ReactNode }) => React.JSX.Element {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useUsers", () => {
	it("retorna lista paginada tipada do MSW", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.get("page")).toBe("2")
				expect(url.searchParams.get("limit")).toBe("10")
				return HttpResponse.json(
					{
						users: [
							{
								id: "u1",
								name: "Ana",
								email: "ana@example.com",
								role: "MEMBER",
							},
							{
								id: "u2",
								name: "Bia",
								email: "bia@example.com",
								role: "ADMIN",
							},
						],
						pagination: { page: 2, limit: 10, total: 22 },
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(() => useUsers({ page: 2, limit: 10 }), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.users).toHaveLength(2)
		expect(result.current.data?.users[0].email).toBe("ana@example.com")
		expect(result.current.data?.pagination).toEqual({
			page: 2,
			limit: 10,
			total: 22,
		})
	})

	it("propaga ApiError quando backend retorna 401", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, () =>
				HttpResponse.json({ message: "unauth" }, { status: 401 }),
			),
		)

		const { result } = renderHook(() => useUsers({ page: 1, limit: 10 }), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isError).toBe(true))
		expect(result.current.error?.status).toBe(401)
	})
})
