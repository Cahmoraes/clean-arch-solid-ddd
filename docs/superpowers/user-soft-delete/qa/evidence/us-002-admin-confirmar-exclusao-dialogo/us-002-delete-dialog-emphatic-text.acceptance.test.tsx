import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { DeleteConfirmationDialog } from "@/features/admin/components/user-detail/confirmation-dialogs"

describe("DeleteConfirmationDialog — RF-017 texto enfático sobre irreversibilidade", () => {
	test("renderiza título e texto enfático sobre irreversibilidade quando aberto", () => {
		render(
			<DeleteConfirmationDialog
				open={true}
				userName="Ana Silva"
				onOpenChange={vi.fn()}
				isPending={false}
				isDeleting={false}
				onConfirm={vi.fn()}
			/>,
		)

		expect(screen.getByText("Excluir usuário?")).toBeInTheDocument()
		expect(
			screen.getByText(/não pode ser desfeita pela interface/i),
		).toBeInTheDocument()
		expect(screen.getByText(/Ana Silva/)).toBeInTheDocument()
	})

	test("botão de confirmação tem variant destructive e label correto", () => {
		render(
			<DeleteConfirmationDialog
				open={true}
				userName="Ana Silva"
				onOpenChange={vi.fn()}
				isPending={false}
				isDeleting={false}
				onConfirm={vi.fn()}
			/>,
		)

		const confirmBtn = screen.getByRole("button", { name: /confirmar exclusão/i })
		expect(confirmBtn).toBeInTheDocument()
		expect(confirmBtn).not.toBeDisabled()
	})

	test("botão mostra 'Excluindo...' quando isDeleting=true", () => {
		render(
			<DeleteConfirmationDialog
				open={true}
				userName="Ana Silva"
				onOpenChange={vi.fn()}
				isPending={true}
				isDeleting={true}
				onConfirm={vi.fn()}
			/>,
		)

		expect(screen.getByRole("button", { name: /excluindo\.\.\./i })).toBeInTheDocument()
	})

	test("botões ficam disabled quando isPending=true (guard contra duplo clique)", () => {
		render(
			<DeleteConfirmationDialog
				open={true}
				userName="Ana Silva"
				onOpenChange={vi.fn()}
				isPending={true}
				isDeleting={false}
				onConfirm={vi.fn()}
			/>,
		)

		const cancelBtn = screen.getByRole("button", { name: /cancelar/i })
		expect(cancelBtn).toBeDisabled()
	})

	test("chama onConfirm ao clicar em confirmar exclusão", async () => {
		const user = userEvent.setup()
		const onConfirm = vi.fn()
		render(
			<DeleteConfirmationDialog
				open={true}
				userName="Ana Silva"
				onOpenChange={vi.fn()}
				isPending={false}
				isDeleting={false}
				onConfirm={onConfirm}
			/>,
		)

		await user.click(screen.getByRole("button", { name: /confirmar exclusão/i }))
		expect(onConfirm).toHaveBeenCalledTimes(1)
	})

	test("não renderiza conteúdo quando open=false", () => {
		render(
			<DeleteConfirmationDialog
				open={false}
				userName="Ana Silva"
				onOpenChange={vi.fn()}
				isPending={false}
				isDeleting={false}
				onConfirm={vi.fn()}
			/>,
		)

		expect(screen.queryByText("Excluir usuário?")).not.toBeInTheDocument()
	})
})
