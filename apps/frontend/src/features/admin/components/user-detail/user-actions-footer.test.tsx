import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
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
		onEdit: vi.fn(),
		onActivate: vi.fn(),
		onOpenSuspend: vi.fn(),
		onOpenPromote: vi.fn(),
		onOpenDemote: vi.fn(),
		onOpenDelete: vi.fn(),
	}
}

describe("UserActionsFooter", () => {
	test("renderiza o botão Editar e dispara onEdit", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		render(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /editar/i }))
		expect(props.onEdit).toHaveBeenCalledTimes(1)
	})

	test("abre confirmação ao clicar em Inativar", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		render(<UserActionsFooter {...props} />)
		await user.click(screen.getByRole("button", { name: /inativar/i }))
		expect(props.onOpenSuspend).toHaveBeenCalledTimes(1)
	})

	test("botão Excluir habilitado dispara onOpenDelete", async () => {
		const user = userEvent.setup()
		const props = baseProps()
		render(<UserActionsFooter {...props} />)
		const btn = screen.getByRole("button", { name: /excluir/i })
		expect(btn).not.toBeDisabled()
		await user.click(btn)
		expect(props.onOpenDelete).toHaveBeenCalledTimes(1)
	})

	test("oculta botão Excluir quando canDelete é false", () => {
		const props = baseProps()
		props.permissions.canDelete = false
		render(<UserActionsFooter {...props} />)
		expect(
			screen.queryByRole("button", { name: /excluir/i }),
		).not.toBeInTheDocument()
	})

	test("oculta Inativar quando não permitido", () => {
		const props = baseProps()
		props.permissions.canSuspend = false
		render(<UserActionsFooter {...props} />)
		expect(
			screen.queryByRole("button", { name: /inativar/i }),
		).not.toBeInTheDocument()
	})
})
