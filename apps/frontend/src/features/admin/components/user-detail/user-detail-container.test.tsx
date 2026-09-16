import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
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
	return render(<UserDetailContainer user={user} onClose={vi.fn()} />, {
		wrapper,
	})
}

// Reproduz o grid pai real de `admin-users-grid`
// (apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx), 2
// colunas explícitas via `lg:grid-cols-[...]`. `UserDetailContainer` ocupa
// a 2ª coluna sozinho; se render() dele produzir >1 filho direto do grid
// (Fragment com 2 irmãos), o auto-placement do CSS grid empurra o extra
// para uma linha implícita e quebra o split-view.
function renderInGrid(user: AdminUser | null) {
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
		<div data-testid="admin-users-grid">
			<div>lista</div>
			<UserDetailContainer user={user} onClose={vi.fn()} />
		</div>,
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

	test("no desktop com usuário, wrapper tem classes sticky e max-height", () => {
		isDesktopMock.mockReturnValue(true)
		const { container } = renderContainer(buildUser())
		const wrapper = container.firstChild as HTMLElement
		expect(wrapper.className).toContain("lg:self-start")
		expect(wrapper.className).toContain("lg:sticky")
		expect(wrapper.className).toContain("lg:top-4")

		const panel = wrapper.firstChild as HTMLElement
		expect(panel.className).toContain("lg:max-h-[calc(100vh-2rem)]")
		expect(panel.className).toContain("lg:overflow-y-auto")
	})

	test("no desktop sem usuário (EmptyState), wrapper tem classe self-start e sticky", () => {
		isDesktopMock.mockReturnValue(true)
		const { container } = renderContainer(null)
		const wrapper = container.firstChild as HTMLElement
		expect(wrapper.className).toContain("lg:self-start")
		expect(wrapper.className).toContain("lg:sticky")
	})

	describe("FR-006, FR-007: transição do painel ao trocar/fechar seleção no desktop", () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		test("ao desselecionar, mantém o painel visível durante os 300ms antes de mostrar o EmptyState", () => {
			isDesktopMock.mockReturnValue(true)
			const user = buildUser()
			const { rerender } = renderContainer(user)
			expect(screen.getByRole("banner")).toBeInTheDocument()

			rerender(<UserDetailContainer user={null} onClose={vi.fn()} />)

			// EmptyState aparece de imediato; o painel antigo continua montado
			// durante a janela de saída da transição (FR-006, FR-007).
			expect(screen.getByRole("banner")).toBeInTheDocument()
			expect(screen.getByText(/selecione um usuário/i)).toBeInTheDocument()

			act(() => {
				vi.advanceTimersByTime(300)
			})

			expect(screen.queryByRole("banner")).not.toBeInTheDocument()
			expect(screen.getByText(/selecione um usuário/i)).toBeInTheDocument()
		})

		test("no grid de 2 colunas, mantém exatamente 2 filhos diretos durante a transição de fechamento", () => {
			isDesktopMock.mockReturnValue(true)
			const user = buildUser()
			const { container, rerender } = renderInGrid(user)
			const grid = container.querySelector(
				'[data-testid="admin-users-grid"]',
			) as HTMLElement
			expect(grid.children).toHaveLength(2)

			rerender(
				<div data-testid="admin-users-grid">
					<div>lista</div>
					<UserDetailContainer user={null} onClose={vi.fn()} />
				</div>,
			)

			// Janela de transição: EmptyState e painel antigo (fade-out) montados
			// ao mesmo tempo — o grid ainda deve ver só 2 filhos diretos.
			expect(screen.getByText(/selecione um usuário/i)).toBeInTheDocument()
			expect(grid.children).toHaveLength(2)

			act(() => {
				vi.advanceTimersByTime(300)
			})

			expect(grid.children).toHaveLength(2)
		})
	})
})
