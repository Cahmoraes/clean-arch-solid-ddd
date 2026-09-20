import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"

const replace = vi.fn()
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		replace,
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
	usePathname: () => "/admin/avisos/novo",
}))

import { useAuthStore } from "@/lib/auth/auth-store"
import { renderWithProviders } from "@/test/render"
import AdminLayout from "../../layout"
import AdminNovoAvisoPage from "./page"

const FORM_NAME = "Formulário de novo aviso"

function setUser(role: "MEMBER" | "ADMIN") {
	useAuthStore.setState({
		accessToken: "token",
		expiresAt: Date.now() + 60_000,
		user: { id: "u1", role },
	})
}

function renderPageUnderAdminLayout() {
	return renderWithProviders(
		<AdminLayout>
			<AdminNovoAvisoPage />
		</AdminLayout>,
	)
}

describe("Acesso à página Novo aviso", () => {
	beforeEach(() => {
		replace.mockClear()
		useAuthStore.getState().clear()
	})

	test("ADMIN vê o formulário e não é redirecionado", () => {
		setUser("ADMIN")

		renderPageUnderAdminLayout()

		expect(screen.getByRole("form", { name: FORM_NAME })).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { level: 1, name: "Novo aviso" }),
		).toBeInTheDocument()
		expect(replace).not.toHaveBeenCalled()
	})

	test("MEMBER não vê o formulário e é redirecionado para /", () => {
		setUser("MEMBER")

		renderPageUnderAdminLayout()

		expect(
			screen.queryByRole("form", { name: FORM_NAME }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("heading", { name: "Novo aviso" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Enviar aviso" }),
		).not.toBeInTheDocument()
		expect(replace).toHaveBeenCalledWith("/")
	})

	test("sem usuário carregado (boot) o formulário não aparece", () => {
		renderPageUnderAdminLayout()

		expect(screen.getByTestId("admin-guard-loading")).toBeInTheDocument()
		expect(
			screen.queryByRole("form", { name: FORM_NAME }),
		).not.toBeInTheDocument()
	})
})
