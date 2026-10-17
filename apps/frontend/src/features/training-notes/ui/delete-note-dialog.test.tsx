import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { DeleteNoteDialog } from "./delete-note-dialog"

describe("DeleteNoteDialog", () => {
	test("mostra o título e a descrição com a data por extenso", async () => {
		renderWithProviders(
			<DeleteNoteDialog
				open
				date="2026-10-16"
				onOpenChange={vi.fn()}
				onDeleted={vi.fn()}
			/>,
		)
		expect(
			await screen.findByRole("alertdialog", { name: "Excluir a nota?" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"A nota de 16 de outubro será apagada e sairá da célula e da lista. Essa ação não pode ser desfeita.",
			),
		).toBeInTheDocument()
	})

	test("confirmar apaga a nota, avisa e chama onDeleted", async () => {
		const apagou = vi.fn()
		server.use(
			http.delete(endpoint("/training-notes/:date"), ({ params }) => {
				apagou(params.date)
				return new HttpResponse(null, { status: 204 })
			}),
		)
		const onOpenChange = vi.fn()
		const onDeleted = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(
			<DeleteNoteDialog
				open
				date="2026-10-16"
				onOpenChange={onOpenChange}
				onDeleted={onDeleted}
			/>,
		)
		await user.click(await screen.findByRole("button", { name: "Confirmar" }))
		await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
		expect(apagou).toHaveBeenCalledWith("2026-10-16")
		expect(toast.success).toHaveBeenCalledWith("Nota excluída.")
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})

	test("cancelar não apaga a nota", async () => {
		const apagou = vi.fn()
		server.use(
			http.delete(endpoint("/training-notes/:date"), () => {
				apagou()
				return new HttpResponse(null, { status: 204 })
			}),
		)
		const onOpenChange = vi.fn()
		const onDeleted = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(
			<DeleteNoteDialog
				open
				date="2026-10-16"
				onOpenChange={onOpenChange}
				onDeleted={onDeleted}
			/>,
		)
		await user.click(await screen.findByRole("button", { name: "Cancelar" }))
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(apagou).not.toHaveBeenCalled()
		expect(onDeleted).not.toHaveBeenCalled()
	})

	test("404 mostra 'Nota não encontrada — recarregue o mês' e mantém o diálogo aberto", async () => {
		vi.mocked(toast.error).mockClear()
		server.use(
			http.delete(endpoint("/training-notes/:date"), () =>
				HttpResponse.json({ message: "x" }, { status: 404 }),
			),
		)
		const onOpenChange = vi.fn()
		const onDeleted = vi.fn()
		const user = userEvent.setup()
		renderWithProviders(
			<DeleteNoteDialog
				open
				date="2026-10-16"
				onOpenChange={onOpenChange}
				onDeleted={onDeleted}
			/>,
		)
		await user.click(await screen.findByRole("button", { name: "Confirmar" }))
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Nota não encontrada — recarregue o mês",
			),
		)
		expect(onDeleted).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
		expect(screen.getByRole("alertdialog")).toBeInTheDocument()
	})

	test("date nulo não renderiza conteúdo", () => {
		renderWithProviders(
			<DeleteNoteDialog
				open
				date={null}
				onOpenChange={vi.fn()}
				onDeleted={vi.fn()}
			/>,
		)
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
	})
})
