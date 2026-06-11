/**
 * US-006 — Acceptance Test
 * RF-016: contadores atualizados após promover/rebaixar usuário.
 *
 * Estratégia: verificar via queryClient.getQueryState() que
 * [USER_STATS_QUERY_KEY] é invalidado (isInvalidated=true) no onSettled
 * de usePromoteToAdmin e useDemoteFromAdmin.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useDemoteFromAdmin } from "@/features/admin/api/use-demote-from-admin"
import { usePromoteToAdmin } from "@/features/admin/api/use-promote-to-admin"
import { USER_STATS_QUERY_KEY } from "@/features/admin/api/use-user-stats"
import { adminUsersQueryKey, type UseUsersResult } from "@/features/admin/api/use-users"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const QUERY_PARAMS = { page: 1, limit: 10 }

const MEMBER_USER = {
	id: "u1",
	name: "João",
	email: "joao@example.com",
	role: "MEMBER" as const,
	status: "activated" as const,
	createdAt: "2024-01-01T00:00:00.000Z",
}

const ADMIN_USER = {
	id: "u2",
	name: "Maria",
	email: "maria@example.com",
	role: "ADMIN" as const,
	status: "activated" as const,
	createdAt: "2024-01-01T00:00:00.000Z",
}

function makeQueryClient(): QueryClient {
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

describe("US-006 — RF-016: contadores refletem após promover/rebaixar usuário", () => {
	test("usePromoteToAdmin invalida USER_STATS_QUERY_KEY no onSettled (sucesso)", async () => {
		const queryClient = makeQueryClient()

		const usersData: UseUsersResult = {
			users: [MEMBER_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		}
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), usersData)
		// Seed stats cache so invalidation is detectable
		queryClient.setQueryData([USER_STATS_QUERY_KEY], {
			total: 10,
			members: 10,
			admins: 0,
			active: 10,
			inactive: 0,
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/promote-admin`, () =>
				HttpResponse.json({}, { status: 200 }),
			),
		)

		const { result } = renderHook(() => usePromoteToAdmin(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const statsState = queryClient.getQueryState([USER_STATS_QUERY_KEY])
		expect(statsState?.isInvalidated).toBe(true)
	})

	test("usePromoteToAdmin invalida USER_STATS_QUERY_KEY no onSettled (erro)", async () => {
		const queryClient = makeQueryClient()

		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [MEMBER_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		})
		queryClient.setQueryData([USER_STATS_QUERY_KEY], {
			total: 10,
			members: 10,
			admins: 0,
			active: 10,
			inactive: 0,
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/promote-admin`, () =>
				HttpResponse.json({ message: "Erro" }, { status: 500 }),
			),
		)

		const { result } = renderHook(() => usePromoteToAdmin(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate("u1")
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		const statsState = queryClient.getQueryState([USER_STATS_QUERY_KEY])
		expect(statsState?.isInvalidated).toBe(true)
	})

	test("useDemoteFromAdmin invalida USER_STATS_QUERY_KEY no onSettled (sucesso)", async () => {
		const queryClient = makeQueryClient()

		const usersData: UseUsersResult = {
			users: [ADMIN_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		}
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), usersData)
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
			result.current.mutate("u2")
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const statsState = queryClient.getQueryState([USER_STATS_QUERY_KEY])
		expect(statsState?.isInvalidated).toBe(true)
	})

	test("useDemoteFromAdmin invalida USER_STATS_QUERY_KEY no onSettled (erro)", async () => {
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
			result.current.mutate("u2")
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		const statsState = queryClient.getQueryState([USER_STATS_QUERY_KEY])
		expect(statsState?.isInvalidated).toBe(true)
	})
})
