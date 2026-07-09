import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, test } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"
import { makeTestJwt } from "@/test/render"
import { UserDetailPanel } from "@/features/admin/components/user-detail/user-detail-panel"

/**
 * US-07 acceptance test — gap identificado durante QA.
 *
 * user-detail-panel.test.tsx cobre:
 *  - admin comum vendo MEMBER -> botão "Editar dados" visível
 *  - admin comum vendo o próprio perfil -> botão oculto
 *
 * Mas não cobre o caso central de US-07/FR-002: admin comum vendo OUTRO
 * admin (id diferente, role ADMIN) -> botão deve ficar oculto, pois
 * canEditProfileRule (use-user-detail-actions.ts) só permite
 * admin comum editar MEMBER, nunca outro ADMIN.
 *
 * Este teste fecha essa lacuna de cobertura, na íntegra alinhado com
 * UserManagementPolicy.canEditProfile (backend) via commit 79e8b98b.
 */
function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "other-admin-id",
		name: "Outro Admin",
		email: "outro-admin@example.com",
		role: "ADMIN",
		status: "activated",
		createdAt: "2025-01-12T08:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}

function renderPanel(user: AdminUser) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return render(<UserDetailPanel user={user} />, { wrapper })
}

describe("US-07 — admin comum não vê edição ao visualizar outro admin (gap)", () => {
	afterEach(() => {
		useAuthStore.getState().clear()
	})

	test("admin comum não exibe o botão Editar dados ao visualizar outro admin (não-root)", () => {
		useAuthStore
			.getState()
			.setSession(
				makeTestJwt({ sub: "admin-id", role: "ADMIN", isSuperAdmin: false }),
			)
		renderPanel(buildUser({ id: "other-admin-id", role: "ADMIN" }))

		expect(
			screen.queryByRole("button", { name: /editar dados/i }),
		).not.toBeInTheDocument()
	})
})
