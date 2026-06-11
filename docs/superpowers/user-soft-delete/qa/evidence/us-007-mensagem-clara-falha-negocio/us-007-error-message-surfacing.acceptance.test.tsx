/**
 * US-007 Acceptance Test — RF-020
 * Verifica que errorMessage é exposto pelo useUserDetailActions
 * quando deleteUser falha com 403 (auto-exclusão ou super admin).
 *
 * NOTA: toApiError em use-delete-user.ts recebe o body parsed do openapi-fetch
 * (não um Error instance), então usa mapStatusToMessage(500) como fallback.
 * O userMessage resultante é a mensagem genérica de 500, não a de 403.
 * Esse comportamento está documentado como gap (ver result.json).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { server } from "@/test/msw/server"
import { useUserDetailActions } from "@/features/admin/components/user-detail/use-user-detail-actions"

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

describe("US-007 — errorMessage surfacing após delete falhar (RF-020)", () => {
	test("expõe errorMessage não-nulo quando deleteUser retorna 403 (auto-exclusão / super admin)", async () => {
		server.use(
			http.delete(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json(
					{ message: "Você não pode excluir a si mesmo." },
					{ status: 403 },
				),
			),
		)

		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ id: "u2" })),
			{ wrapper: wrapper() },
		)

		// Antes da mutação: sem erro
		expect(result.current.errorMessage).toBeNull()

		act(() => {
			result.current.onConfirmDelete({
				preventDefault: () => {},
			} as React.MouseEvent<HTMLButtonElement>)
		})

		await waitFor(() => expect(result.current.errorMessage).not.toBeNull())

		// Mensagem deve existir (qualquer string não-vazia satisfaz RF-020 de surfacing)
		expect(typeof result.current.errorMessage).toBe("string")
		expect(result.current.errorMessage!.length).toBeGreaterThan(0)
	})

	test("expõe errorMessage não-nulo quando deleteUser retorna 404 (usuário não encontrado)", async () => {
		server.use(
			http.delete(`${apiBaseUrl}/users/:userId`, () =>
				HttpResponse.json(
					{ message: "Usuário não encontrado." },
					{ status: 404 },
				),
			),
		)

		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ id: "u3" })),
			{ wrapper: wrapper() },
		)

		expect(result.current.errorMessage).toBeNull()

		act(() => {
			result.current.onConfirmDelete({
				preventDefault: () => {},
			} as React.MouseEvent<HTMLButtonElement>)
		})

		await waitFor(() => expect(result.current.errorMessage).not.toBeNull())

		expect(typeof result.current.errorMessage).toBe("string")
		expect(result.current.errorMessage!.length).toBeGreaterThan(0)
	})

	test("errorMessage retorna null após delete bem-sucedido (204)", async () => {
		server.use(
			http.delete(
				`${apiBaseUrl}/users/:userId`,
				() => new HttpResponse(null, { status: 204 }),
			),
		)

		const { result } = renderHook(
			() => useUserDetailActions(buildUser({ id: "u4" })),
			{ wrapper: wrapper() },
		)

		act(() => {
			result.current.onConfirmDelete({
				preventDefault: () => {},
			} as React.MouseEvent<HTMLButtonElement>)
		})

		await waitFor(() =>
			expect(result.current.flags.isDeleting).toBe(false),
		)

		expect(result.current.errorMessage).toBeNull()
	})
})
