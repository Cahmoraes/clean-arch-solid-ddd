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

async function openMenu() {
	const trigger = screen.getByRole("button", { name: /mais ações/i })
	await userEvent.click(trigger)
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
		const handlers = baseHandlers()
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu()
		const item = screen.getByRole("menuitem", { name: /tornar admin/i })
		expect(item).toBeInTheDocument()
		await userEvent.click(item)
		expect(handlers.onOpenPromote).toHaveBeenCalledTimes(1)
	})

	test("exibe 'Remover Admin' quando canDemoteFromAdmin = true", async () => {
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
		await openMenu()
		expect(
			screen.getByRole("menuitem", { name: /remover admin/i }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("menuitem", { name: /tornar admin/i }),
		).not.toBeInTheDocument()
	})

	test("exibe 'Inativar' em cor warning quando canSuspend = true", async () => {
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu()
		const item = screen.getByRole("menuitem", { name: /inativar/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-warning")
	})

	test("chama onOpenSuspend ao clicar em Inativar (não executa diretamente)", async () => {
		const handlers = baseHandlers()
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu()
		await userEvent.click(screen.getByRole("menuitem", { name: /inativar/i }))
		expect(handlers.onOpenSuspend).toHaveBeenCalledTimes(1)
		expect(handlers.onActivate).not.toHaveBeenCalled()
	})

	test("exibe 'Ativar' em cor success quando canActivate = true", async () => {
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
		await openMenu()
		const item = screen.getByRole("menuitem", { name: /^ativar$/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-success")
	})

	test("exibe 'Desbloquear' quando canActivate = true e isLocked = true", async () => {
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
		await openMenu()
		expect(
			screen.getByRole("menuitem", { name: /desbloquear/i }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("menuitem", { name: /^ativar$/i }),
		).not.toBeInTheDocument()
	})

	test("chama onActivate diretamente (sem dialog) ao clicar em Ativar", async () => {
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
		await openMenu()
		await userEvent.click(screen.getByRole("menuitem", { name: /^ativar$/i }))
		expect(handlers.onActivate).toHaveBeenCalledTimes(1)
		expect(handlers.onOpenSuspend).not.toHaveBeenCalled()
	})

	test("exibe 'Excluir' em cor destructive quando canDelete = true", async () => {
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu()
		const item = screen.getByRole("menuitem", { name: /excluir/i })
		expect(item).toBeInTheDocument()
		expect(item.className).toContain("text-destructive")
	})

	test("chama onOpenDelete ao clicar em Excluir (não executa diretamente)", async () => {
		const handlers = baseHandlers()
		render(
			<MoreActionsMenu
				permissions={basePermissions()}
				flags={baseFlags()}
				{...handlers}
			/>,
		)
		await openMenu()
		await userEvent.click(screen.getByRole("menuitem", { name: /excluir/i }))
		expect(handlers.onOpenDelete).toHaveBeenCalledTimes(1)
	})

	test("não exibe 'Excluir' quando canDelete = false", async () => {
		const permissions = { ...basePermissions(), canDelete: false }
		render(
			<MoreActionsMenu
				permissions={permissions}
				flags={baseFlags()}
				{...baseHandlers()}
			/>,
		)
		await openMenu()
		expect(
			screen.queryByRole("menuitem", { name: /excluir/i }),
		).not.toBeInTheDocument()
	})

	test("não exibe separador quando grupo acima está vazio (sem Tornar/Remover Admin)", async () => {
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
		await openMenu()
		// Não há separator antes de Inativar se grupo 1 está vazio
		const separators = document.querySelectorAll('[role="separator"]')
		// Apenas o separator entre grupo 2 e grupo 3 deve existir
		expect(separators).toHaveLength(1)
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
