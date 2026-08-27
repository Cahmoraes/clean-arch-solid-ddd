import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { DetailsEditForm } from "./details-edit-form"
import type { UserDetailPermissions } from "./use-user-detail-actions"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "m1",
		name: "Maria",
		email: "maria@test.com",
		role: "MEMBER",
		status: "activated",
		isSuperAdmin: false,
		createdAt: "2025-01-01T00:00:00.000Z",
		...overrides,
	}
}

const allPermissions: UserDetailPermissions = {
	canSuspend: true,
	canActivate: true,
	canPromoteToAdmin: true,
	canDemoteFromAdmin: true,
	canDelete: true,
	isLocked: false,
	canEditProfile: true,
	canChangeStatus: true,
	canChangeRole: true,
}

function renderForm(
	user: AdminUser = buildUser(),
	permissions: UserDetailPermissions = allPermissions,
	onCancel = vi.fn(),
	onSaved = vi.fn(),
) {
	return renderWithProviders(
		<DetailsEditForm
			user={user}
			permissions={permissions}
			onCancel={onCancel}
			onSaved={onSaved}
		/>,
	)
}

describe("DetailsEditForm", () => {
	test("renderiza inputs de nome e email quando canEditProfile é true", () => {
		renderForm()
		expect(screen.getByLabelText(/nome/i)).toHaveValue("Maria")
		expect(screen.getByLabelText(/e-mail/i)).toHaveValue("maria@test.com")
	})

	test("oculta campos de nome e email quando canEditProfile é false", () => {
		renderForm(buildUser(), { ...allPermissions, canEditProfile: false })
		expect(screen.queryByLabelText(/nome/i)).not.toBeInTheDocument()
		expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument()
	})

	test("renderiza select de status quando canChangeStatus é true", () => {
		renderForm()
		expect(screen.getByLabelText("Status")).toBeInTheDocument()
	})

	test("oculta select de status quando canChangeStatus é false", () => {
		renderForm(buildUser(), { ...allPermissions, canChangeStatus: false })
		expect(screen.queryByLabelText("Status")).not.toBeInTheDocument()
	})

	test("renderiza select de permissão quando canChangeRole é true", () => {
		renderForm()
		expect(screen.getByLabelText("Permissão")).toBeInTheDocument()
	})

	test("oculta select de permissão quando canChangeRole é false", () => {
		renderForm(buildUser(), { ...allPermissions, canChangeRole: false })
		expect(screen.queryByLabelText("Permissão")).not.toBeInTheDocument()
	})

	test("botão Salvar fica desabilitado quando nenhum campo mudou", () => {
		renderForm()
		expect(
			screen.getByRole("button", { name: "Salvar alterações" }),
		).toBeDisabled()
	})

	test("botão Salvar fica habilitado ao alterar o nome", async () => {
		const user = userEvent.setup()
		renderForm()
		await user.clear(screen.getByLabelText(/nome/i))
		await user.type(screen.getByLabelText(/nome/i), "Novo Nome")
		expect(
			screen.getByRole("button", { name: "Salvar alterações" }),
		).toBeEnabled()
	})

	test("botão Cancelar chama onCancel", async () => {
		const onCancel = vi.fn()
		const user = userEvent.setup()
		renderForm(buildUser(), allPermissions, onCancel)
		await user.click(screen.getByRole("button", { name: "Cancelar" }))
		expect(onCancel).toHaveBeenCalledOnce()
	})

	test("salvar nome alterado envia PATCH e chama onSaved", async () => {
		const onSaved = vi.fn()
		const user = userEvent.setup()
		let patched = false

		server.use(
			http.patch(`${apiBaseUrl}/users/:userId`, () => {
				patched = true
				return HttpResponse.json({}, { status: 200 })
			}),
		)

		renderForm(buildUser(), allPermissions, vi.fn(), onSaved)

		await user.clear(screen.getByLabelText(/nome/i))
		await user.type(screen.getByLabelText(/nome/i), "Maria Editada")
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

		await waitFor(() => {
			expect(patched).toBe(true)
			expect(onSaved).toHaveBeenCalledOnce()
		})
	})

	test("exibe erro inline quando a API retorna 403", async () => {
		const user = userEvent.setup()

		server.use(
			http.patch(`${apiBaseUrl}/users/:userId`, () => {
				return HttpResponse.json({ message: "Forbidden" }, { status: 403 })
			}),
		)

		renderForm()

		await user.clear(screen.getByLabelText(/nome/i))
		await user.type(screen.getByLabelText(/nome/i), "Outro Nome")
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument()
		})
	})

	test("salvar suspensão envia PATCH /users/suspend e chama onSaved", async () => {
		const onSaved = vi.fn()
		const user = userEvent.setup()
		let suspended = false

		server.use(
			http.patch(`${apiBaseUrl}/users/suspend`, () => {
				suspended = true
				return HttpResponse.json({}, { status: 200 })
			}),
		)

		renderForm(
			buildUser({ status: "activated" }),
			{ ...allPermissions, canEditProfile: false, canChangeRole: false },
			vi.fn(),
			onSaved,
		)

		await user.selectOptions(screen.getByLabelText("Status"), "suspended")
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

		await waitFor(() => {
			expect(suspended).toBe(true)
			expect(onSaved).toHaveBeenCalledOnce()
		})
	})

	test("salvar promoção envia PATCH /users/promote-admin e chama onSaved", async () => {
		const onSaved = vi.fn()
		const user = userEvent.setup()
		let promoted = false

		server.use(
			http.patch(`${apiBaseUrl}/users/promote-admin`, () => {
				promoted = true
				return HttpResponse.json({}, { status: 200 })
			}),
		)

		renderForm(
			buildUser({ role: "MEMBER", status: "activated" }),
			{ ...allPermissions, canEditProfile: false, canChangeStatus: false },
			vi.fn(),
			onSaved,
		)

		await user.selectOptions(screen.getByLabelText("Permissão"), "ADMIN")
		await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

		await waitFor(() => {
			expect(promoted).toBe(true)
			expect(onSaved).toHaveBeenCalledOnce()
		})
	})

	test("select de status tem appearance-none e ícone chevron", () => {
		renderForm()
		const statusSelect = screen.getByLabelText("Status")
		expect(statusSelect).toHaveClass("appearance-none")
		expect(statusSelect.parentElement?.querySelector("svg")).toBeInTheDocument()
	})

	test("select de permissão tem appearance-none e ícone chevron", () => {
		renderForm()
		const roleSelect = screen.getByLabelText("Permissão")
		expect(roleSelect).toHaveClass("appearance-none")
		expect(roleSelect.parentElement?.querySelector("svg")).toBeInTheDocument()
	})

	test("indica os campos Nome e E-mail como obrigatórios via aria-required e texto para leitor de tela", () => {
		renderForm()
		expect(screen.getByLabelText(/nome/i)).toHaveAttribute(
			"aria-required",
			"true",
		)
		expect(screen.getByLabelText(/e-mail/i)).toHaveAttribute(
			"aria-required",
			"true",
		)
		expect(screen.getAllByText("(obrigatório)")).toHaveLength(2)
		expect(screen.queryByText("*")).not.toBeInTheDocument()
	})

	test("ícones decorativos dos selects de Status e Permissão ficam ocultos de leitores de tela", () => {
		renderForm()
		const statusIcon = screen
			.getByLabelText("Status")
			.parentElement?.querySelector("svg")
		const roleIcon = screen
			.getByLabelText("Permissão")
			.parentElement?.querySelector("svg")
		expect(statusIcon).toHaveAttribute("aria-hidden", "true")
		expect(roleIcon).toHaveAttribute("aria-hidden", "true")
	})
})
