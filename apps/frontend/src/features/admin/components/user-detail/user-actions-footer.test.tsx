import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { renderWithProviders } from "@/test/render"
import { UserActionsFooter } from "./user-actions-footer"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "u1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-01T00:00:00.000Z",
		isSuperAdmin: false,
		...overrides,
	}
}

function baseProps() {
	return {
		user: buildUser(),
		permissions: {
			canActivate: false,
			canSuspend: true,
			canPromoteToAdmin: true,
			canDemoteFromAdmin: false,
			canDelete: true,
			isLocked: false,
			canEditProfile: true,
			canChangeStatus: true,
			canChangeRole: false,
		},
		flags: {
			isPending: false,
			isActivating: false,
			isSuspending: false,
			isPromoting: false,
			isDemoting: false,
			isDeleting: false,
		},
		canEdit: true,
		onEdit: vi.fn(),
		onActivate: vi.fn(),
		onOpenSuspend: vi.fn(),
		onOpenPromote: vi.fn(),
		onOpenDemote: vi.fn(),
		onOpenDelete: vi.fn(),
	}
}

describe("UserActionsFooter", () => {
	test("renderiza o botão Editar dados e dispara onEdit ao clicar", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /editar dados/i }))
		expect(props.onEdit).toHaveBeenCalledTimes(1)
	})

	test("oculta o botão Editar dados quando canEdit é false", () => {
		renderWithProviders(<UserActionsFooter {...baseProps()} canEdit={false} />)
		expect(
			screen.queryByRole("button", { name: /editar dados/i }),
		).not.toBeInTheDocument()
	})

	test("renderiza o botão Mais ações sempre", () => {
		renderWithProviders(<UserActionsFooter {...baseProps()} />)
		expect(
			screen.getByRole("button", { name: /mais ações/i }),
		).toBeInTheDocument()
	})

	test("renderiza o botão Mais ações mesmo quando canEdit é false", () => {
		renderWithProviders(<UserActionsFooter {...baseProps()} canEdit={false} />)
		expect(
			screen.getByRole("button", { name: /mais ações/i }),
		).toBeInTheDocument()
	})

	test("abre o dropdown e chama onOpenSuspend ao clicar em Inativar", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		await user.click(screen.getByRole("menuitem", { name: /inativar/i }))
		expect(props.onOpenSuspend).toHaveBeenCalledTimes(1)
	})

	test("abre o dropdown e chama onOpenDelete ao clicar em Excluir", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		await user.click(screen.getByRole("menuitem", { name: /excluir/i }))
		expect(props.onOpenDelete).toHaveBeenCalledTimes(1)
	})

	test("abre o dropdown e não exibe Excluir quando canDelete = false", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		props.permissions.canDelete = false
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		expect(
			screen.queryByRole("menuitem", { name: /excluir/i }),
		).not.toBeInTheDocument()
	})

	test("abre o dropdown e chama onOpenPromote ao clicar em Tornar Admin", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		renderWithProviders(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /mais ações/i }))
		await user.click(screen.getByRole("menuitem", { name: /tornar admin/i }))
		expect(props.onOpenPromote).toHaveBeenCalledTimes(1)
	})

	test("botão Editar dados tem classe bg-accent", () => {
		renderWithProviders(<UserActionsFooter {...baseProps()} />)
		const btn = screen.getByRole("button", { name: /editar dados/i })
		expect(btn.classList.contains("bg-accent")).toBe(true)
	})

	test("botão Editar dados fica desabilitado quando isPending = true", () => {
		const props = baseProps()
		props.flags.isPending = true
		renderWithProviders(<UserActionsFooter {...props} />)
		expect(screen.getByRole("button", { name: /editar dados/i })).toBeDisabled()
	})

	test("FR-001: o botão Editar dados não exibe texto visível, só aria-label", () => {
		renderWithProviders(<UserActionsFooter {...baseProps()} />)
		const btn = screen.getByRole("button", { name: /editar dados/i })
		expect(within(btn).queryByText("Editar dados")).not.toBeInTheDocument()
		expect(btn).toHaveAttribute("aria-label", "Editar dados")
	})

	test("FR-008: exibe tooltip 'Editar dados' no hover e no foco de teclado", async () => {
		const user = userEvent.setup()
		renderWithProviders(<UserActionsFooter {...baseProps()} />)
		const btn = screen.getByRole("button", { name: /editar dados/i })

		await user.hover(btn)
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Editar dados")
		await user.unhover(btn)

		btn.focus()
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Editar dados")
	})
})
