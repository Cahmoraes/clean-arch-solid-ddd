import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import { server } from "@/test/msw/server"
import { useBulkChangeUserStatus } from "./use-bulk-change-user-status"
import { adminUsersQueryKey } from "./use-users"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

const QUERY_PARAMS = { page: 1, limit: 10 }

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

describe("useBulkChangeUserStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	test("invalida as query keys de usuários e estatísticas e exibe toast.success ao concluir", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [],
			pagination: { total: 0, page: 1, limit: 10 },
		})
		queryClient.setQueryData(["user-stats"], {
			total: 0,
			members: 0,
			admins: 0,
			active: 0,
			inactive: 0,
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/bulk-activate`, () =>
				HttpResponse.json(
					{ updated: 2, requested: 3, skipped: 1 },
					{ status: 200 },
				),
			),
		)

		const { result } = renderHook(() => useBulkChangeUserStatus(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate({
				userIds: ["u1", "u2", "u3"],
				action: "activate",
			})
		})

		await waitFor(() => expect(result.current.isSuccess).toBe(true))

		expect(toast.success).toHaveBeenCalledTimes(1)
		expect(
			queryClient.getQueryState(adminUsersQueryKey(QUERY_PARAMS))
				?.isInvalidated,
		).toBe(true)
		expect(queryClient.getQueryState(["user-stats"])?.isInvalidated).toBe(true)
	})

	test("exibe toast.error e não invalida as queries quando a API retorna erro", async () => {
		const queryClient = makeQueryClient()
		queryClient.setQueryData(adminUsersQueryKey(QUERY_PARAMS), {
			users: [],
			pagination: { total: 0, page: 1, limit: 10 },
		})

		server.use(
			http.patch(`${apiBaseUrl}/users/bulk-deactivate`, () =>
				HttpResponse.json({ message: "Erro interno" }, { status: 500 }),
			),
		)

		const { result } = renderHook(() => useBulkChangeUserStatus(), {
			wrapper: wrapper(queryClient),
		})

		act(() => {
			result.current.mutate({ userIds: ["u1"], action: "deactivate" })
		})

		await waitFor(() => expect(result.current.isError).toBe(true))

		expect(toast.error).toHaveBeenCalledTimes(1)
		expect(toast.success).not.toHaveBeenCalled()
	})
})
