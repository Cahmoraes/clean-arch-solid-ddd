import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { MoreActionsMenuProps } from "./more-actions-menu"
import { MoreActionsMenu } from "./more-actions-menu"

function basePermissions(): MoreActionsMenuProps["permissions"] {
	return {
		canActivate: false,
		canSuspend: true,
		canPromoteToAdmin: true,
		canDemoteFromAdmin: false,
		canDelete: true,
		isLocked: false,
		canEditProfile: true,
		canChangeStatus: true,
		canChangeRole: false,
	}
}

function baseFlags(): MoreActionsMenuProps["flags"] {
	return {
		isPending: false,
		isActivating: false,
		isSuspending: false,
		isPromoting: false,
		isDemoting: false,
		isDeleting: false,
	}
}

function baseHandlers() {
	return {
		onActivate: vi.fn(),
		onOpenSuspend: vi.fn(),
		onOpenPromote: vi.fn(),
		onOpenDemote: vi.fn(),
		onOpenDelete: vi.fn(),
	}
}

type UserInstance = ReturnType<typeof userEvent.setup>

async function openMenu(user: UserInstance) {
	await user.click(screen.getByRole("button", { name: /mais ações/i }))
}

describe("MoreActionsMenu", () => {
	test("renderiza o trigger 'Mais ações'", () => {
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		expect(
			screen.getByRole("button", { name: /mais ações/i }),
		).toBeInTheDocument()
	})

	test("exibe 'Tornar Admin' quando canPromoteToAdmin = true e abre dialog ao clicar", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		const item = screen.getByRole("menuitem", { name: /tornar admin/i })
		expect(item).toBeInTheDocument()
		await user.click(item)
		expect(handlers.onOpenPromote).toHaveBeenCalledTimes(1)
	})

	test("exibe 'Remover Admin' quando canDemoteFromAdmin = true", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canPromoteToAdmin: false,
			canDemoteFromAdmin: true,
		}
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		expect(
			screen.getByRole("menuitem", { name: /remover admin/i }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("menuitem", { name: /tornar admin/i }),
		).not.toBeInTheDocument()
	})

	test("exibe 'Inativar' em cor warning quando canSuspend = true", async () => {
		const user = userEvent.setup()
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const item = screen.getByRole("menuitem", { name: /inativar/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-warning")
	})

	test("chama onOpenSuspend ao clicar em Inativar (não executa diretamente)", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		await user.click(screen.getByRole("menuitem", { name: /inativar/i }))
		expect(handlers.onOpenSuspend).toHaveBeenCalledTimes(1)
		expect(handlers.onActivate).not.toHaveBeenCalled()
	})

	test("exibe 'Ativar' em cor success quando canActivate = true", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canActivate: true,
			canSuspend: false,
			isLocked: false,
		}
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const item = screen.getByRole("menuitem", { name: /^ativar$/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-success")
	})

	test("exibe 'Desbloquear' quando canActivate = true e isLocked = true", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canActivate: true,
			canSuspend: false,
			isLocked: true,
		}
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		expect(
			screen.getByRole("menuitem", { name: /desbloquear/i }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("menuitem", { name: /^ativar$/i }),
		).not.toBeInTheDocument()
	})

	test("chama onActivate diretamente (sem dialog) ao clicar em Ativar", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		const permissions = {
			...basePermissions(),
			canActivate: true,
			canSuspend: false,
		}
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		await user.click(screen.getByRole("menuitem", { name: /^ativar$/i }))
		expect(handlers.onActivate).toHaveBeenCalledTimes(1)
		expect(handlers.onOpenSuspend).not.toHaveBeenCalled()
	})

	test("chama onActivate diretamente ao clicar em Desbloquear (FR-016)", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		const permissions = {
			...basePermissions(),
			canActivate: true,
			canSuspend: false,
			isLocked: true,
		}
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		await user.click(screen.getByRole("menuitem", { name: /desbloquear/i }))
		expect(handlers.onActivate).toHaveBeenCalledTimes(1)
		expect(handlers.onOpenSuspend).not.toHaveBeenCalled()
	})

	test("exibe 'Excluir' em cor destructive quando canDelete = true", async () => {
		const user = userEvent.setup()
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const item = screen.getByRole("menuitem", { name: /excluir/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-destructive")
	})

	test("chama onOpenDelete ao clicar em Excluir (não executa diretamente)", async () => {
		const user = userEvent.setup()
		const handlers = baseHandlers()
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu(user)
		await user.click(screen.getByRole("menuitem", { name: /excluir/i }))
		expect(handlers.onOpenDelete).toHaveBeenCalledTimes(1)
	})

	test("não exibe 'Excluir' quando canDelete = false", async () => {
		const user = userEvent.setup()
		const permissions = { ...basePermissions(), canDelete: false }
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		expect(
			screen.queryByRole("menuitem", { name: /excluir/i }),
		).not.toBeInTheDocument()
	})

	test("não exibe separador quando grupo acima está vazio (sem Tornar/Remover Admin)", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canPromoteToAdmin: false,
			canDemoteFromAdmin: false,
			canSuspend: true,
		}
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const separators = document.querySelectorAll('[role="separator"]')
		expect(separators).toHaveLength(1)
	})

	test("exibe separador entre grupo admin e excluir quando grupo status está vazio", async () => {
		const user = userEvent.setup()
		const permissions = {
			...basePermissions(),
			canPromoteToAdmin: true,
			canSuspend: false,
			canActivate: false,
			canDelete: true,
		}
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu(user)
		const separators = document.querySelectorAll('[role="separator"]')
		expect(separators).toHaveLength(1)
	})

	test("não renderiza nada quando todas as permissões estão negadas", () => {
		const permissions = {
			...basePermissions(),
			canPromoteToAdmin: false,
			canDemoteFromAdmin: false,
			canSuspend: false,
			canActivate: false,
			canDelete: false,
		}
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		expect(
			screen.queryByRole("button", { name: /mais ações/i }),
		).not.toBeInTheDocument()
	})

	test("desabilita o trigger quando isPending = true", () => {
		const flags = { ...baseFlags(), isPending: true }
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={flags}
				{...baseHandlers()}
			/>,
		)
		expect(screen.getByRole("button", { name: /mais ações/i })).toBeDisabled()
	})
})
