import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import { server } from "@/test/msw/server"
import { useUpdateUser } from "./use-update-user"
import { adminUsersQueryKey, type UseUsersResult } from "./use-users"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const QUERY_PARAMS = { page: 1, limit: 10 }

const ORIGINAL_USER = {
	id: "u1",
	name: "Nome Antigo",
	email: "antigo@example.com",
	role: "MEMBER" as const,
	status: "activated" as const,
	createdAt: "2024-01-01T00:00:00.000Z",
	isSuperAdmin: false,
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

describe("useUpdateUser", () => {
	test("aplica optimistic update do nome e email antes da resposta da API", async () => {
		const queryClient = makeQueryClient()
		const initialData: UseUsersResult = {
			users: [ORIGINAL_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		}
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), initialData)

		let resolveRequest!: () => void
		server.use(
			http.patch(`${apiBaseUrl}/users/u1`, async () => {
				await new Promise<void>((resolve) => {
					resolveRequest = resolve
				})
				return HttpResponse.json({}, { status: 200 })
			}),
		)

		const { result } = renderHook(() => useUpdateUser(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate({
				userId: "u1",
				name: "Nome Novo",
				email: "novo@example.com",
			})
		})

		await waitFor(() => {
			const data = queryClient.getQueryData<UseUsersResult>(
				adminUsersQueryKey(QUERY_PARAMS),
			)
			expect(data?.users[0]?.name).toBe("Nome Novo")
			expect(data?.users[0]?.email).toBe("novo@example.com")
		})

		resolveRequest()
		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("completa a mutação com sucesso quando a API retorna 200", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [ORIGINAL_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/u1`, () =>
				HttpResponse.json({}, { status: 200 }),
			),
		)

		const { result } = renderHook(() => useUpdateUser(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate({
				userId: "u1",
				name: "Nome Novo",
				email: "novo@example.com",
			})
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
	})

	test("restaura os dados anteriores no cache em caso de erro da API", async () => {
		const queryClient = makeQueryClient()
		const initialData: UseUsersResult = {
			users: [ORIGINAL_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		}
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), initialData)

		server.use(
			http.patch(`${apiBaseUrl}/users/u1`, () =>
				HttpResponse.json({ message: "Erro interno" }, { status: 500 }),
			),
		)

		const { result } = renderHook(() => useUpdateUser(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate({
				userId: "u1",
				name: "Nome Novo",
				email: "novo@example.com",
			})
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		const restoredData = queryClient.getQueryData<UseUsersResult>(
			adminUsersQueryKey(QUERY_PARAMS),
		)
		expect(restoredData?.users[0]?.name).toBe("Nome Antigo")
		expect(restoredData?.users[0]?.email).toBe("antigo@example.com")
	})

	test("invalida ADMIN_USERS_QUERY_KEY após mutação com sucesso", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [ORIGINAL_USER],
			pagination: { total: 1, page: 1, limit: 10 },
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/u1`, () =>
				HttpResponse.json({}, { status: 200 }),
			),
		)

		const { result } = renderHook(() => useUpdateUser(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate({
				userId: "u1",
				name: "Nome Novo",
				email: "novo@example.com",
			})
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		const queryState = queryClient.getQueryState(
			adminUsersQueryKey(QUERY_PARAMS),
		)
		expect(queryState?.isInvalidated).toBe(true)
	})
})
