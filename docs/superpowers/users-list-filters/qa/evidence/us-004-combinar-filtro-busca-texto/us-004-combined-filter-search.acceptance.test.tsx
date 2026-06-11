import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useUsers } from "@/features/admin/api/use-users"

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

describe("US-004 — Combinar filtro de categoria com busca por texto", () => {
	test("deve enviar role=ADMIN e query=joao simultaneamente quando filter='admin' e query='joao'", async () => {
		let capturedUrl: URL | null = null

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				capturedUrl = new URL(request.url)
				return HttpResponse.json(
					{
						users: [
							{
								id: "u-joao-admin",
								name: "João",
								email: "joao@example.com",
								role: "ADMIN",
							},
						],
						pagination: { page: 1, limit: 10, total: 1 },
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(
			() =>
				useUsers({
					page: 1,
					limit: 10,
					filter: "admin",
					query: "joao",
				}),
			{ wrapper: wrapper() },
		)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(capturedUrl).not.toBeNull()
		expect(capturedUrl!.searchParams.get("role")).toBe("ADMIN")
		expect(capturedUrl!.searchParams.get("query")).toBe("joao")
	})

	test("deve enviar role=MEMBER e query=maria simultaneamente quando filter='member' e query='maria'", async () => {
		let capturedUrl: URL | null = null

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				capturedUrl = new URL(request.url)
				return HttpResponse.json(
					{
						users: [
							{
								id: "u-maria-member",
								name: "Maria",
								email: "maria@example.com",
								role: "MEMBER",
							},
						],
						pagination: { page: 1, limit: 10, total: 1 },
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(
			() =>
				useUsers({
					page: 1,
					limit: 10,
					filter: "member",
					query: "maria",
				}),
			{ wrapper: wrapper() },
		)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(capturedUrl).not.toBeNull()
		expect(capturedUrl!.searchParams.get("role")).toBe("MEMBER")
		expect(capturedUrl!.searchParams.get("query")).toBe("maria")
	})

	test("deve enviar status=active e query=joao simultaneamente quando filter='active' e query='joao'", async () => {
		let capturedUrl: URL | null = null

		server.use(
			http.get(`${apiBaseUrl}/users`, ({ request }) => {
				capturedUrl = new URL(request.url)
				return HttpResponse.json(
					{
						users: [],
						pagination: { page: 1, limit: 10, total: 0 },
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(
			() =>
				useUsers({
					page: 1,
					limit: 10,
					filter: "active",
					query: "joao",
				}),
			{ wrapper: wrapper() },
		)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(capturedUrl).not.toBeNull()
		expect(capturedUrl!.searchParams.get("status")).toBe("active")
		expect(capturedUrl!.searchParams.get("query")).toBe("joao")
		expect(capturedUrl!.searchParams.has("role")).toBe(false)
	})
})
