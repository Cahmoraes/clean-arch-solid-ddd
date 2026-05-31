import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useDeleteUser } from "./use-delete-user"
import { adminUsersQueryKey, type UseUsersResult } from "./use-users"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const QUERY_PARAMS = { page: 1, limit: 10 }

const ACTIVE_USER = {
	id: "u1",
	name: "Ana",
	email: "ana@example.com",
	role: "MEMBER" as const,
	status: "activated" as const,
	createdAt: "2024-01-01T00:00:00.000Z",
}

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: Infinity, staleTime: 0 },
			mutations: { retry: false },
		},
	})
}

function wrapper(
	queryClient: QueryClient,
): (props: { children: ReactNode }) => React.JSX.Element {
	return ({ children }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe("useDeleteUser", () => {
	test("remove o usuário do cache otimisticamente antes de a requisição completar", async () => {
		const queryClient = makeQueryClient()
		const initialData: UseUsersResult = {
			users: [ACTIVE_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		}
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), initialData)

		let resolveRequest!: () => void
		server.use(
			http.delete(`${apiBaseUrl}/users/:userId`, async () => {
				await new Promise<void>((resolve) => {
					resolveRequest = resolve
				})
				return new HttpResponse(null, { status: 204 })
			}),
		)

		const { result } = renderHook(() => useDeleteUser(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => {
			const data = queryClient.getQueryData<UseUsersResult>(
				adminUsersQueryKey(QUERY_PARAMS),
			)
			expect(data?.users).toHaveLength(0)
		})

		resolveRequest()
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("restaura o usuário no cache em caso de erro 403 da API", async () => {
		const queryClient = makeQueryClient()
		const initialData: UseUsersResult = {
			users: [ACTIVE_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		}
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), initialData)

		server.use(
			http.delete(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json({ message: "Proibido" }, { status: 403 }),
			),
		)

		const { result } = renderHook(() => useDeleteUser(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		const restoredData = queryClient.getQueryData<UseUsersResult>(
			adminUsersQueryKey(QUERY_PARAMS),
		)
		expect(restoredData?.users[0]?.id).toBe("u1")
	})

	test("invalida queries de listagem e stats após a mutação (onSettled)", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [ACTIVE_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		})

		server.use(
			http.delete(
				`${apiBaseUrl}/users/:userId`,
				() => new HttpResponse(null, { status: 204 }),
			),
		)

		const { result } = renderHook(() => useDeleteUser(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const queryState = queryClient.getQueryState(
			adminUsersQueryKey(QUERY_PARAMS),
		)
		expect(queryState?.isInvalidated).toBe(true)
	})
})
