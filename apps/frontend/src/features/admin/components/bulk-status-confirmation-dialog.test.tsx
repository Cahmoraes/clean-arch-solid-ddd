import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { BulkStatusConfirmationDialog } from "./bulk-status-confirmation-dialog"

describe("BulkStatusConfirmationDialog", () => {
	test("renderiza título e descrição de ativação quando action é 'activate'", () => {
		render(
			<BulkStatusConfirmationDialog
				open
				action="activate"
				count={3}
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		expect(
			screen.getByRole("heading", { name: "Confirmar ativação em massa" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"Tem certeza que deseja ativar 3 usuários selecionados? Eles voltarão a ter acesso aos recursos protegidos.",
			),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Confirmar ativação" }),
		).toBeInTheDocument()
	})

	test("renderiza título e descrição de desativação quando action é 'deactivate'", () => {
		render(
			<BulkStatusConfirmationDialog
				open
				action="deactivate"
				count={1}
				isPending={false}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		)

		expect(
			screen.getByRole("heading", { name: "Confirmar desativação em massa" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"Tem certeza que deseja desativar 1 usuário selecionado? Eles perderão o acesso aos recursos protegidos até serem reativados.",
			),
		).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Confirmar desativação" }),
		).toBeInTheDocument()
	})

	test("onConfirm é chamado ao confirmar e onOpenChange(false) é chamado ao cancelar", async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		const onOpenChange = vi.fn()

		render(
			<BulkStatusConfirmationDialog
				open
				action="activate"
				count={2}
				isPending={false}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
			/>,
		)

		await user.click(screen.getByRole("button", { name: "Confirmar ativação" }))
		expect(onConfirm).toHaveBeenCalledTimes(1)

		await user.click(screen.getByRole("button", { name: "Cancelar" }))
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
