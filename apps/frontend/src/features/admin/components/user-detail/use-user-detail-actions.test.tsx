import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"
import { server } from "@/test/msw/server"
import { makeTestJwt } from "@/test/render"
import { useUserDetailActions } from "./use-user-detail-actions"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	}
}

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

describe("useUserDetailActions", () => {
	test("expõe permissão de promover para membro ativo", () => {
		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ role: "MEMBER" })),
			{ wrapper: wrapper() },
		)
		expect(result.current.permissions.canPromoteToAdmin).toBe(true)
		expect(result.current.permissions.canDemoteFromAdmin).toBe(false)
	})

	test("não permite suspender o próprio usuário logado", () => {
		useAuthStore
			.getState()
			.setSession(makeTestJwt({ sub: "u1", role: "MEMBER" }))
		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ id: "u1", role: "MEMBER" })),
			{ wrapper: wrapper() },
		)
		expect(result.current.permissions.canSuspend).toBe(false)
	})

	test("controla o estado de abertura do diálogo de suspensão", () => {
		const { result } = renderHook(() => useUserDetailActions(buildUser()), {
			wrapper: wrapper(),
		})
		expect(result.current.confirm.suspendOpen).toBe(false)
		act(() => result.current.confirm.setSuspendOpen(true))
		expect(result.current.confirm.suspendOpen).toBe(true)
	})

	test("executa a ativação chamando o endpoint", async () => {
		let called = false
		server.use(
			http.patch(`${apiBaseUrl}/users/activate`, () => {
				called = true
				return HttpResponse.json({}, { status: 200 })
			}),
		)
		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ status: "suspended" })),
			{ wrapper: wrapper() },
		)
		act(() => result.current.onActivate())
		await waitFor(() => expect(called).toBe(true))
	})
})
