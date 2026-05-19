import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"
import { ApiError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render"
import { UserDetailModal } from "@/features/admin/components/user-detail-modal"

const mockPromote = vi.fn()
const mockDemote = vi.fn()
const mockUsePromoteToAdmin = vi.fn()
const mockUseDemoteFromAdmin = vi.fn()

vi.mock("@/features/admin/api/use-promote-to-admin", () => ({
	usePromoteToAdmin: () => mockUsePromoteToAdmin(),
}))

vi.mock("@/features/admin/api/use-demote-from-admin", () => ({
	useDemoteFromAdmin: () => mockUseDemoteFromAdmin(),
}))

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "user-1",
		name: "João Silva",
		email: "joao@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-15T12:00:00.000Z",
		...overrides,
	}
}

function renderModal(user: AdminUser = buildUser(), onClose = vi.fn()) {
	return renderWithProviders(
		<UserDetailModal user={user} open onClose={onClose} />,
	)
}

describe("UserDetailModal - Promote/Demote Confirmations (US-004)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		useAuthStore.setState({
			accessToken: "token",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-logged", role: "ADMIN" },
		})
		mockUsePromoteToAdmin.mockReturnValue({
			mutate: mockPromote,
			isPending: false,
			isError: false,
			error: null,
		})
		mockUseDemoteFromAdmin.mockReturnValue({
			mutate: mockDemote,
			isPending: false,
			isError: false,
			error: null,
		})
	})

	describe("Promote Confirmation Dialog (RF-002)", () => {
		test("exibe botão de promoção para membro ativo", () => {
			renderModal(buildUser({ role: "MEMBER", status: "activated" }))
			expect(
				screen.getByRole("button", { name: "Tornar Administrador" }),
			).toBeInTheDocument()
		})

		test("abre AlertDialog ao clicar em 'Tornar Administrador'", async () => {
			const user = userEvent.setup()
			renderModal(buildUser({ role: "MEMBER", status: "activated" }))

			await user.click(
				screen.getByRole("button", { name: "Tornar Administrador" }),
			)

			expect(screen.getByRole("alertdialog")).toBeInTheDocument()
			expect(
				screen.getByRole("heading", { name: /Tornar administrador/i }),
			).toBeInTheDocument()
		})

		test("confirma promoção após clicar em Confirmar", async () => {
			const user = userEvent.setup()
			renderModal(buildUser({ id: "user-promo", role: "MEMBER" }))

			await user.click(
				screen.getByRole("button", { name: "Tornar Administrador" }),
			)
			await user.click(screen.getByRole("button", { name: "Confirmar" }))

			expect(mockPromote).toHaveBeenCalledTimes(1)
			expect(mockPromote).toHaveBeenCalledWith(
				"user-promo",
				expect.objectContaining({ onSuccess: expect.any(Function) }),
			)
		})

		test("fecha AlertDialog ao cancelar promoção", async () => {
			const user = userEvent.setup()
			renderModal(buildUser({ role: "MEMBER" }))

			await user.click(
				screen.getByRole("button", { name: "Tornar Administrador" }),
			)
			expect(screen.getByRole("alertdialog")).toBeInTheDocument()

			await user.click(screen.getByRole("button", { name: "Cancelar" }))
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
			expect(mockPromote).not.toHaveBeenCalled()
		})
	})

	describe("Demote Confirmation Dialog (RF-009)", () => {
		test("exibe botão de remoção para administrador (não super-admin)", () => {
			renderModal(
				buildUser({
					id: "admin-user",
					role: "ADMIN",
					email: "regular-admin@example.com",
				}),
			)
			expect(
				screen.getByRole("button", { name: "Remover Administrador" }),
			).toBeInTheDocument()
		})

		test("abre AlertDialog ao clicar em 'Remover Administrador'", async () => {
			const user = userEvent.setup()
			renderModal(
				buildUser({
					role: "ADMIN",
					email: "regular-admin@example.com",
				}),
			)

			await user.click(
				screen.getByRole("button", { name: "Remover Administrador" }),
			)

			expect(screen.getByRole("alertdialog")).toBeInTheDocument()
			expect(
				screen.getByRole("heading", {
					name: /Remover privilégios de admin/i,
				}),
			).toBeInTheDocument()
		})

		test("confirma remoção após clicar em Remover", async () => {
			const user = userEvent.setup()
			renderModal(
				buildUser({
					id: "user-demote",
					role: "ADMIN",
					email: "regular-admin@example.com",
				}),
			)

			await user.click(
				screen.getByRole("button", { name: "Remover Administrador" }),
			)
			await user.click(screen.getByRole("button", { name: "Remover" }))

			expect(mockDemote).toHaveBeenCalledTimes(1)
			expect(mockDemote).toHaveBeenCalledWith(
				"user-demote",
				expect.objectContaining({ onSuccess: expect.any(Function) }),
			)
		})

		test("fecha AlertDialog ao cancelar remoção", async () => {
			const user = userEvent.setup()
			renderModal(
				buildUser({
					role: "ADMIN",
					email: "regular-admin@example.com",
				}),
			)

			await user.click(
				screen.getByRole("button", { name: "Remover Administrador" }),
			)
			expect(screen.getByRole("alertdialog")).toBeInTheDocument()

			await user.click(screen.getByRole("button", { name: "Cancelar" }))
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
			expect(mockDemote).not.toHaveBeenCalled()
		})

		test("não exibe botão de remoção para super-admin", () => {
			renderModal(
				buildUser({
					role: "ADMIN",
					email: "admin@admin.com",
				}),
			)
			expect(
				screen.queryByRole("button", { name: "Remover Administrador" }),
			).not.toBeInTheDocument()
		})

		test("não exibe botão de remoção para admin logado", () => {
			renderModal(
				buildUser({
					id: "admin-logged",
					role: "ADMIN",
					email: "regular-admin@example.com",
				}),
			)
			expect(
				screen.queryByRole("button", { name: "Remover Administrador" }),
			).not.toBeInTheDocument()
		})
	})
})
