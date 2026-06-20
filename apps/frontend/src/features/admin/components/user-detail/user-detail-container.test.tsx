import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { UserDetailContainer } from "./user-detail-container"

const isDesktopMock = vi.fn<() => boolean>()
vi.mock("@/lib/hooks/use-is-desktop", () => ({
	useIsDesktop: () => isDesktopMock(),
}))

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "João Damasio",
		email: "joao@example.com",
		role: "ADMIN",
		status: "activated",
		createdAt: "2025-01-12T08:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}

function renderContainer(user: AdminUser | null) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0, staleTime: 0 },
			mutations: { retry: false },
		},
	})
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return render(
		<UserDetailContainer user={user} onClose={vi.fn()} onEdit={vi.fn()} />,
		{ wrapper },
	)
}

beforeEach(() => {
	isDesktopMock.mockReset()
})

describe("UserDetailContainer", () => {
	test("no desktop sem usuário, exibe estado vazio", () => {
		isDesktopMock.mockReturnValue(true)
		renderContainer(null)
		expect(screen.getByText(/selecione um usuário/i)).toBeInTheDocument()
	})

	test("no desktop com usuário, renderiza o painel sem dialog", () => {
		isDesktopMock.mockReturnValue(true)
		renderContainer(buildUser())
		const banner = screen.getByRole("banner")
		expect(within(banner).getByText("João Damasio")).toBeInTheDocument()
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})

	test("no mobile com usuário, renderiza o painel dentro de um dialog", () => {
		isDesktopMock.mockReturnValue(false)
		renderContainer(buildUser())
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		const banner = screen.getByRole("banner")
		expect(within(banner).getByText("João Damasio")).toBeInTheDocument()
	})

	test("no mobile sem usuário, não renderiza dialog", () => {
		isDesktopMock.mockReturnValue(false)
		renderContainer(null)
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
	})
})
