import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, test, vi } from "vitest"
import type { AdminUser } from "@/features/admin/api/use-users"
import { useAuthStore } from "@/lib/auth/auth-store"
import { ApiError } from "@/lib/errors"
import { renderWithProviders } from "@/test/render"
import { UserDetailModal } from "./user-detail-modal"

const mockActivate = vi.fn()
const mockSuspend = vi.fn()
const mockUseActivateUser = vi.fn()
const mockUseSuspendUser = vi.fn()

vi.mock("@/features/admin/api/use-activate-user", () => ({
	useActivateUser: () => mockUseActivateUser(),
}))

vi.mock("@/features/admin/api/use-suspend-user", () => ({
	useSuspendUser: () => mockUseSuspendUser(),
}))

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
	return {
		id: "user-1",
		name: "Ana Silva",
		email: "ana@example.com",
		role: "MEMBER",
		status: "activated",
		createdAt: "2024-01-15T12:00:00.000Z",
		...overrides,
	}
}

function formatCreatedAt(iso: string): string {
	return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
		new Date(iso),
	)
}

function renderModal(user: AdminUser = buildUser(), onClose = vi.fn()) {
	return renderWithProviders(
		<UserDetailModal user={user} open onClose={onClose} />,
	)
}

describe("UserDetailModal", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		useAuthStore.setState({
			accessToken: "token",
			expiresAt: Date.now() + 60_000,
			user: { id: "admin-logged", role: "ADMIN" },
		})
		mockUseActivateUser.mockReturnValue({
			mutate: mockActivate,
			isPending: false,
			isError: false,
			error: null,
		})
		mockUseSuspendUser.mockReturnValue({
			mutate: mockSuspend,
			isPending: false,
			isError: false,
			error: null,
		})
	})

	test("renderiza os dados do usuário selecionado", () => {
		const user = buildUser()
		renderModal(user)

		expect(screen.getByRole("dialog")).toBeInTheDocument()
		expect(screen.getByText("Ana Silva")).toBeInTheDocument()
		expect(screen.getByText("ana@example.com")).toBeInTheDocument()
		expect(screen.getByText("Membro")).toBeInTheDocument()
		expect(screen.getByText("Ativo")).toBeInTheDocument()
		expect(
			screen.getByText(formatCreatedAt(user.createdAt)),
		).toBeInTheDocument()
	})

	test("exibe botão de inativar para usuário ativo que não é admin", () => {
		renderModal(buildUser({ status: "activated", role: "MEMBER" }))

		expect(screen.getByRole("button", { name: "Inativar" })).toBeInTheDocument()
	})

	test("não exibe botão de inativar para usuário admin", () => {
		renderModal(buildUser({ role: "ADMIN" }))

		expect(
			screen.queryByRole("button", { name: "Inativar" }),
		).not.toBeInTheDocument()
	})

	test("não exibe botão de inativar para o admin logado", () => {
		renderModal(buildUser({ id: "admin-logged" }))

		expect(
			screen.queryByRole("button", { name: "Inativar" }),
		).not.toBeInTheDocument()
	})

	test("exibe botão de ativar para usuário suspenso", () => {
		renderModal(buildUser({ status: "suspended" }))

		expect(screen.getByRole("button", { name: "Ativar" })).toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Inativar" }),
		).not.toBeInTheDocument()
	})

	test("exibe botões de desbloquear e inativar para usuário bloqueado", () => {
		renderModal(buildUser({ status: "locked", role: "MEMBER" }))

		expect(
			screen.getByRole("button", { name: "Desbloquear" }),
		).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Inativar" })).toBeInTheDocument()
		expect(screen.getByText("Bloqueado")).toBeInTheDocument()
	})

	test("chama a mutação de ativação ao desbloquear usuário bloqueado", async () => {
		const user = userEvent.setup()
		renderModal(buildUser({ id: "user-55", status: "locked", role: "MEMBER" }))

		await user.click(screen.getByRole("button", { name: "Desbloquear" }))

		expect(mockActivate).toHaveBeenCalledTimes(1)
		expect(mockActivate).toHaveBeenCalledWith("user-55")
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
	})

	test("abre o AlertDialog ao clicar em inativar", async () => {
		const user = userEvent.setup()
		renderModal(buildUser())

		await user.click(screen.getByRole("button", { name: "Inativar" }))

		expect(screen.getByRole("alertdialog")).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { name: "Confirmar inativação" }),
		).toBeInTheDocument()
	})

	test("chama a mutação de inativação após confirmar no AlertDialog", async () => {
		const user = userEvent.setup()
		renderModal(buildUser({ id: "user-99" }))

		await user.click(screen.getByRole("button", { name: "Inativar" }))
		await user.click(
			screen.getByRole("button", { name: "Confirmar inativação" }),
		)

		expect(mockSuspend).toHaveBeenCalledTimes(1)
		expect(mockSuspend).toHaveBeenCalledWith(
			"user-99",
			expect.objectContaining({ onSuccess: expect.any(Function) }),
		)
	})

	test("chama a mutação de ativação sem confirmação", async () => {
		const user = userEvent.setup()
		renderModal(buildUser({ id: "user-77", status: "suspended" }))

		await user.click(screen.getByRole("button", { name: "Ativar" }))

		expect(mockActivate).toHaveBeenCalledTimes(1)
		expect(mockActivate).toHaveBeenCalledWith("user-77")
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
	})

	test("exibe estado de loading durante a requisição", () => {
		mockUseActivateUser.mockReturnValue({
			mutate: mockActivate,
			isPending: true,
			isError: false,
			error: null,
		})

		renderModal(buildUser({ status: "suspended" }))

		const button = screen.getByRole("button", { name: "Ativando..." })
		expect(button).toBeDisabled()
		expect(button).toHaveAttribute("aria-busy", "true")
	})

	test("fecha o AlertDialog e exibe erro inline quando a API falha ao inativar", async () => {
		const user = userEvent.setup()
		const suspendError = new ApiError(
			500,
			"network_error",
			"Falha ao inativar usuário.",
		)
		const suspendState = {
			isPending: false,
			isError: false,
			error: null as ApiError | null,
		}
		let triggerSuspendError: (() => void) | undefined

		mockUseSuspendUser.mockImplementation(() => ({
			mutate: mockSuspend,
			isPending: suspendState.isPending,
			isError: suspendState.isError,
			error: suspendState.error,
		}))

		mockSuspend.mockImplementation(
			(
				userId: string,
				options?: {
					onError?: (
						error: ApiError,
						variables: string,
						onMutateResult: undefined,
						context: unknown,
					) => void
				},
			) => {
				triggerSuspendError = () => {
					suspendState.isError = true
					suspendState.error = suspendError
					options?.onError?.(suspendError, userId, undefined, {})
				}
			},
		)

		renderModal(buildUser({ id: "user-22" }))

		await user.click(screen.getByRole("button", { name: "Inativar" }))
		expect(screen.getByRole("alertdialog")).toBeInTheDocument()

		await user.click(
			screen.getByRole("button", { name: "Confirmar inativação" }),
		)

		expect(mockSuspend).toHaveBeenCalledTimes(1)

		act(() => {
			triggerSuspendError?.()
		})

		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
		})
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Falha ao inativar usuário.",
		)
	})

	test("chama onClose ao fechar pelo botão X", async () => {
		const user = userEvent.setup()
		const onClose = vi.fn()
		renderModal(buildUser(), onClose)

		await user.click(screen.getByRole("button", { name: /close/i }))

		expect(onClose).toHaveBeenCalledTimes(1)
	})
})
