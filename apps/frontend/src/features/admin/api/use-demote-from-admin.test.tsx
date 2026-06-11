import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useDemoteFromAdmin } from "./use-demote-from-admin"
import { USER_STATS_QUERY_KEY } from "./use-user-stats"
import { adminUsersQueryKey, type UseUsersResult } from "./use-users"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const QUERY_PARAMS = { page: 1, limit: 10 }

const ADMIN_USER = {
	id: "u1",
	name: "Maria",
	email: "maria@example.com",
	role: "ADMIN" as const,
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

describe("useDemoteFromAdmin", () => {
	test("aplica optimistic update para role 'MEMBER' antes de a requisição completar", async () => {
		const queryClient = makeQueryClient()
		const initialData: UseUsersResult = {
			users: [ADMIN_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		}
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), initialData)

		let resolveRequest!: () => void
		server.use(
			http.patch(`${apiBaseUrl}/users/demote-admin`, async () => {
				await new Promise<void>((resolve) => {
					resolveRequest = resolve
				})
				return HttpResponse.json({}, { status: 200 })
			}),
		)

		const { result } = renderHook(() => useDemoteFromAdmin(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => {
			const data = queryClient.getQueryData<UseUsersResult>(
				adminUsersQueryKey(QUERY_PARAMS),
			)
			expect(data?.users[0]?.role).toBe("MEMBER")
		})

		resolveRequest()
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("completa a mutação com sucesso quando a API retorna 200", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [ADMIN_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/demote-admin`, () =>
				HttpResponse.json({}, { status: 200 }),
			),
		)

		const { result } = renderHook(() => useDemoteFromAdmin(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("restaura o role anterior no cache em caso de erro da API", async () => {
		const queryClient = makeQueryClient()
		const initialData: UseUsersResult = {
			users: [ADMIN_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		}
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), initialData)

		server.use(
			http.patch(`${apiBaseUrl}/users/demote-admin`, () =>
				HttpResponse.json({ message: "Erro interno" }, { status: 500 }),
			),
		)

		const { result } = renderHook(() => useDemoteFromAdmin(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		const restoredData = queryClient.getQueryData<UseUsersResult>(
			adminUsersQueryKey(QUERY_PARAMS),
		)
		expect(restoredData?.users[0]?.role).toBe("ADMIN")
	})

	test("invalida a query de listagem após a mutação (onSettled)", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [ADMIN_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/demote-admin`, () =>
				HttpResponse.json({}, { status: 200 }),
			),
		)

		const { result } = renderHook(() => useDemoteFromAdmin(), {
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

	test("RF-016: invalida USER_STATS_QUERY_KEY após rebaixamento bem-sucedido", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [ADMIN_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		})
		queryClient.setQueryData([USER_STATS_QUERY_KEY], {
			total: 10,
			members: 9,
			admins: 1,
			active: 10,
			inactive: 0,
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/demote-admin`, () =>
				HttpResponse.json({}, { status: 200 }),
			),
		)

		const { result } = renderHook(() => useDemoteFromAdmin(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const statsState = queryClient.getQueryState([USER_STATS_QUERY_KEY])
		expect(statsState?.isInvalidated).toBe(true)
	})

	test("RF-016: invalida USER_STATS_QUERY_KEY mesmo quando rebaixamento falha", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [ADMIN_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		})
		queryClient.setQueryData([USER_STATS_QUERY_KEY], {
			total: 10,
			members: 9,
			admins: 1,
			active: 10,
			inactive: 0,
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/demote-admin`, () =>
				HttpResponse.json({ message: "Erro" }, { status: 500 }),
			),
		)

		const { result } = renderHook(() => useDemoteFromAdmin(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		const statsState = queryClient.getQueryState([USER_STATS_QUERY_KEY])
		expect(statsState?.isInvalidated).toBe(true)
	})
})
