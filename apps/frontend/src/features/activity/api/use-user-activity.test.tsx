import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { userActivityQueryKey, useUserActivity } from "./use-user-activity"

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

describe("useUserActivity", () => {
	test("retorna eventos do endpoint administrativo quando userId é fornecido", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, ({ params }) => {
				expect(params.userId).toBe("user-1")
				return HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "LOGIN",
								description: "Login realizado",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(() => useUserActivity("user-1"), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.events).toHaveLength(1)
		expect(result.current.data?.events[0].description).toBe("Login realizado")
	})

	test("não mantém eventos anteriores ao trocar usuário no admin", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, async ({ params }) => {
				if (params.userId === "user-2") {
					await new Promise((resolve) => setTimeout(resolve, 50))
				}
				return HttpResponse.json(
					{
						events: [
							{
								id: `activity-${params.userId}`,
								type: "LOGIN",
								description: `Login de ${params.userId}`,
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
					},
					{ status: 200 },
				)
			}),
		)

		const { result, rerender } = renderHook(
			({ userId }: { userId: string }) => useUserActivity(userId),
			{
				initialProps: { userId: "user-1" },
				wrapper: wrapper(),
			},
		)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		rerender({ userId: "user-2" })

		expect(result.current.data).toBeUndefined()
		expect(result.current.isFetching).toBe(true)
		await waitFor(() =>
			expect(result.current.data?.events[0].description).toBe(
				"Login de user-2",
			),
		)
	})

	test("chama /users/me/activity com página e retorna paginação", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, ({ request }) => {
				expect(new URL(request.url).searchParams.get("page")).toBe("2")
				return HttpResponse.json(
					{
						events: [
							{
								id: "activity-1",
								type: "CHECK_IN",
								description: "Check-in realizado",
								occurredAt: "2025-01-10T12:00:00.000Z",
							},
						],
						pagination: {
							page: 2,
							pageSize: 20,
							total: 21,
							totalPages: 2,
						},
					},
					{ status: 200 },
				)
			}),
		)

		const { result } = renderHook(
			() => useUserActivity(undefined, { page: 2 }),
			{
				wrapper: wrapper(),
			},
		)

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.events).toHaveLength(1)
		expect(result.current.data?.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 21,
			totalPages: 2,
		})
		expect(userActivityQueryKey(undefined, 2)).toEqual([
			"user-activity",
			"me",
			2,
		])
	})

	test("mantém chave administrativa estável e sem colisão com perfil", () => {
		expect(userActivityQueryKey("user-1", 1)).toEqual([
			"user-activity",
			"admin",
			"user-1",
		])
		expect(userActivityQueryKey("user-1", 2)).toEqual([
			"user-activity",
			"admin",
			"user-1",
		])
		expect(userActivityQueryKey("me", 1)).not.toEqual(
			userActivityQueryKey(undefined, 1),
		)
	})

	test("usa página 1 por padrão na query key", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/me/activity`, () =>
				HttpResponse.json(
					{
						events: [],
						pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
					},
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useUserActivity(undefined), {
			wrapper: wrapper(),
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data?.events).toEqual([])
		expect(userActivityQueryKey(undefined)).toEqual(["user-activity", "me", 1])
	})

	test("não dispara a busca quando enabled é false", async () => {
		server.use(
			http.get(`${apiBaseUrl}/users/:userId/activity`, () => {
				throw new Error("não deveria ser chamado")
			}),
		)

		const { result } = renderHook(
			() => useUserActivity("user-1", { enabled: false }),
			{ wrapper: wrapper() },
		)

		expect(result.current.isPending).toBe(true)
		expect(result.current.fetchStatus).toBe("idle")
	})
})
