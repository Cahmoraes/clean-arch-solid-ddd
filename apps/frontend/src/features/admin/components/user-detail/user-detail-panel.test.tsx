import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { UserDetailPanel } from "./user-detail-panel"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "João Damasio",
		email: "joao@example.com",
		role: "ADMIN",
		status: "activated",
		createdAt: "2025-01-12T08:00:00.000Z",
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
	return render(<UserDetailPanel user={user} onEdit={vi.fn()} />, { wrapper })
}

describe("UserDetailPanel", () => {
	test("exibe nome, e-mail e as três abas", () => {
		renderPanel(buildUser())
		const header = within(screen.getByRole("banner"))
		expect(header.getByText("João Damasio")).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Permissões" })).toBeInTheDocument()
		expect(screen.getByRole("tab", { name: "Atividade" })).toBeInTheDocument()
	})

	test("alterna para a aba Atividade ao clicar", async () => {
		const user = userEvent.setup()
		renderPanel(buildUser())
		await user.click(screen.getByRole("tab", { name: "Atividade" }))
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("exibe o e-mail no cabeçalho de identidade", () => {
		renderPanel(buildUser())
		const header = within(screen.getByRole("banner"))
		expect(header.getByText("joao@example.com")).toBeInTheDocument()
	})
})
