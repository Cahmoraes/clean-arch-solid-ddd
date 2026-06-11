import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { server } from "@/test/msw/server"
import { useUsers } from "./use-users"

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

	it("inclui query param na URL quando fornecido", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.get("query")).toBe("ana")
				return HttpResponse.json(
					{
						users: [
							{
								id: "u1",
								name: "Ana Silva",
								email: "ana@example.com",
								role: "MEMBER",
								status: "activated",
								createdAt: "2024-01-15T12:00:00.000Z",
							},
						],
						pagination: { page: 1, limit: 10, total: 1 },
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(
			() => useUsers({ page: 1, limit: 10, query: "ana" }),
			{ wrapper: wrapper() },
		)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.users).toHaveLength(1)
		expect(result.current.data?.users[0].name).toBe("Ana Silva")
	})

	it("não inclui query param quando query é undefined", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.has("query")).toBe(false)
				return HttpResponse.json(
					{ users: [], pagination: { page: 1, limit: 10, total: 0 } },
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(() => useUsers({ page: 1, limit: 10 }), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("deve enviar role=MEMBER quando filter='member'", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.get("role")).toBe("MEMBER")
				expect(url.searchParams.has("status")).toBe(false)
				return HttpResponse.json(
					{ users: [], pagination: { page: 1, limit: 10, total: 0 } },
					{ status: 200 },
				)
			}),
		)
		const { result } = renderHook(
			() => useUsers({ page: 1, limit: 10, filter: "member" }),
			{ wrapper: wrapper() },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("deve enviar role=ADMIN quando filter='admin'", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.get("role")).toBe("ADMIN")
				return HttpResponse.json(
					{ users: [], pagination: { page: 1, limit: 10, total: 0 } },
					{ status: 200 },
				)
			}),
		)
		const { result } = renderHook(
			() => useUsers({ page: 1, limit: 10, filter: "admin" }),
			{ wrapper: wrapper() },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("deve enviar status=active quando filter='active'", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.get("status")).toBe("active")
				expect(url.searchParams.has("role")).toBe(false)
				return HttpResponse.json(
					{ users: [], pagination: { page: 1, limit: 10, total: 0 } },
					{ status: 200 },
				)
			}),
		)
		const { result } = renderHook(
			() => useUsers({ page: 1, limit: 10, filter: "active" }),
			{ wrapper: wrapper() },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("deve enviar status=inactive quando filter='inactive'", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.get("status")).toBe("inactive")
				expect(url.searchParams.has("role")).toBe(false)
				return HttpResponse.json(
					{ users: [], pagination: { page: 1, limit: 10, total: 0 } },
					{ status: 200 },
				)
			}),
		)
		const { result } = renderHook(
			() => useUsers({ page: 1, limit: 10, filter: "inactive" }),
			{ wrapper: wrapper() },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("não deve enviar role nem status quando filter='all'", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				const url = new URL(request.url)
				expect(url.searchParams.has("role")).toBe(false)
				expect(url.searchParams.has("status")).toBe(false)
				return HttpResponse.json(
					{ users: [], pagination: { page: 1, limit: 10, total: 0 } },
					{ status: 200 },
				)
			}),
		)
		const { result } = renderHook(
			() => useUsers({ page: 1, limit: 10, filter: "all" }),
			{ wrapper: wrapper() },
		)
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})
})
