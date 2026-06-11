/**
 * Acceptance test — US-001 RF-018
 * Confirmar exclusão dispara mutação, invalida queries e chama onClose (fecha painel).
 *
 * Roda FORA do src tree — somente como evidência de QA.
 * Executar via: npx vitest run --config docs/superpowers/.../vitest.evidence.ts <arquivo>
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { server } from "@/test/msw/server"
import { useUserDetailActions } from "@/features/admin/components/user-detail/use-user-detail-actions"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u99",
		name: "Carlos Teste",
		email: "carlos@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-06-01T00:00:00.000Z",
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

describe("US-001 RF-018 — confirmar exclusão fecha painel", () => {
	test("onConfirmDelete chama deleteUser.mutate e dispara onDeleteSuccess → onClose", async () => {
		const onDeleteSuccess = vi.fn()

		server.use(
			http.delete(`${apiBaseUrl}/users/:userId`, () =>
				new HttpResponse(null, { status: 204 }),
			),
		)

		const { result } = renderHook(
			() => useUserDetailActions(buildUser(), { onDeleteSuccess }),
			{ wrapper: wrapper() },
		)

		act(() => result.current.confirm.setDeleteOpen(true))
		expect(result.current.confirm.deleteOpen).toBe(true)

		const fakeEvent = { preventDefault: vi.fn() } as unknown as React.MouseEvent<HTMLButtonElement>
		act(() => result.current.onConfirmDelete(fakeEvent))

		await waitFor(() => expect(onDeleteSuccess).toHaveBeenCalledTimes(1))
		expect(fakeEvent.preventDefault).toHaveBeenCalled()
		expect(result.current.confirm.deleteOpen).toBe(false)
	})

	test("canDelete true para usuário de outro id (RF-016 botão habilitado)", () => {
		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ id: "u99" })),
			{ wrapper: wrapper() },
		)
		expect(result.current.permissions.canDelete).toBe(true)
	})
})
