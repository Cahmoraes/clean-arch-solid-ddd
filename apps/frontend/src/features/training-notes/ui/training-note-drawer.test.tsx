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
import { instalarNotasMock } from "@/test/msw/training-notes-mock"
import { renderWithProviders } from "@/test/render"
import { NoteDrawer, type NoteDrawerProps } from "./training-note-drawer"

function renderGaveta(props: Partial<NoteDrawerProps> = {}) {
	return renderWithProviders(
		<NoteDrawer
			open
			date="2026-10-16"
			onOpenChange={vi.fn()}
			onRequestDelete={vi.fn()}
			onCloseAutoFocus={vi.fn()}
			{...props}
		/>,
	)
}

function registrarSalvamento() {
	const criou = vi.fn()
	const atualizou = vi.fn()
	server.use(
		http.post(endpoint("/training-notes"), async ({ request }) => {
			const corpo = (await request.json()) as { data: string; texto: string }
			criou(corpo)
			return HttpResponse.json(
				{ id: "n1", ...corpo, atualizadoEm: "2026-10-16T12:00:00.000Z" },
				{ status: 201 },
			)
		}),
		http.put(endpoint("/training-notes/:date"), async ({ request, params }) => {
			const corpo = (await request.json()) as { texto: string }
			atualizou(params.date, corpo)
			return HttpResponse.json({
				id: "n1",
				data: String(params.date),
				texto: corpo.texto,
				atualizadoEm: "2026-10-16T12:00:00.000Z",
			})
		}),
	)
	return { criou, atualizou }
}

describe("NoteDrawer", () => {
	test("AC-06 abre com o título da data e o texto atual da nota", async () => {
		renderGaveta({ initialTexto: "Peito + tríceps 4x12" })
		expect(
			await screen.findByRole("heading", { name: "16 de outubro" }),
		).toBeInTheDocument()
		expect(screen.getByLabelText("Nota do treino")).toHaveValue(
			"Peito + tríceps 4x12",
		)
		expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument()
	})

	test("AC-06 ao criar abre com o campo vazio e sem Excluir", async () => {
		renderGaveta()
		expect(await screen.findByLabelText("Nota do treino")).toHaveValue("")
		expect(
			screen.queryByRole("button", { name: "Excluir" }),
		).not.toBeInTheDocument()
	})

	test("AC-07 salvar cria a nota no modo criar, avisa e fecha", async () => {
		const { criou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderGaveta({ onOpenChange })
		await user.type(
			await screen.findByLabelText("Nota do treino"),
			"Peito + tríceps 4x12",
		)
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		expect(criou).toHaveBeenCalledWith({
			data: "2026-10-16",
			texto: "Peito + tríceps 4x12",
		})
		expect(toast.success).toHaveBeenCalledWith("Nota salva.")
	})

	test("AC-07 salvar atualiza a nota no modo editar, avisa e fecha", async () => {
		const { atualizou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderGaveta({ initialTexto: "antigo", onOpenChange })
		const campo = await screen.findByLabelText("Nota do treino")
		await user.clear(campo)
		await user.type(campo, "novo")
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		expect(atualizou).toHaveBeenCalledWith(
			"2026-10-16",
			expect.objectContaining({ texto: "novo" }),
		)
		expect(toast.success).toHaveBeenCalledWith("Nota atualizada.")
	})

	test("salvar envia o texto sem espaços nas pontas", async () => {
		const { criou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderGaveta({ onOpenChange })
		await user.type(
			await screen.findByLabelText("Nota do treino"),
			"  Pernas  ",
		)
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		expect(criou).toHaveBeenCalledWith({ data: "2026-10-16", texto: "Pernas" })
	})

	test("texto vazio mostra 'Escreva de 1 a 500 caracteres' e nada é enviado", async () => {
		const { criou, atualizou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderGaveta({ onOpenChange })
		await user.click(await screen.findByRole("button", { name: "Salvar" }))
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Escreva de 1 a 500 caracteres",
		)
		expect(criou).not.toHaveBeenCalled()
		expect(atualizou).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	test("o contador mostra n/500 enquanto digita", async () => {
		const user = userEvent.setup()
		renderGaveta()
		await user.type(await screen.findByLabelText("Nota do treino"), "abc")
		expect(screen.getByText("3/500")).toBeInTheDocument()
	})

	test("rede falha mantém o rascunho com Repetir visível", async () => {
		vi.mocked(toast.error).mockClear()
		instalarNotasMock({ criacaoComErroDeRede: true })
		const user = userEvent.setup()
		renderGaveta()
		await user.type(
			await screen.findByLabelText("Nota do treino"),
			"Costas 5x5",
		)
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		expect(await screen.findByText(/sem conexão/i)).toBeInTheDocument()
		expect(screen.getByLabelText("Nota do treino")).toHaveValue("Costas 5x5")
		expect(screen.getByRole("button", { name: "Repetir" })).toBeInTheDocument()
		expect(toast.error).toHaveBeenCalledWith("Sem conexão — tente de novo")
	})

	test("Excluir pede a exclusão sem apagar nem fechar", async () => {
		const apagou = vi.fn()
		server.use(
			http.delete(endpoint("/training-notes/:date"), () => {
				apagou()
				return new HttpResponse(null, { status: 204 })
			}),
		)
		const onRequestDelete = vi.fn()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderGaveta({ initialTexto: "x", onRequestDelete, onOpenChange })
		await user.click(await screen.findByRole("button", { name: "Excluir" }))
		expect(onRequestDelete).toHaveBeenCalledWith("2026-10-16")
		expect(apagou).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	test("o subtítulo mostra o dia da semana e o feriado", async () => {
		const { unmount } = renderGaveta({
			date: "2026-10-12",
			feriadoNome: "Nossa Senhora Aparecida",
		})
		expect(
			await screen.findByText("segunda-feira · Nossa Senhora Aparecida"),
		).toBeInTheDocument()
		unmount()
		renderGaveta({ date: "2026-10-16" })
		expect(await screen.findByText("sexta-feira")).toBeInTheDocument()
	})

	test("Review Focus: 409 troca para edição com o aviso e mantém o texto digitado, sem fechar", async () => {
		vi.mocked(toast.error).mockClear()
		instalarNotasMock({ forcar409NaCriacao: true })
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderGaveta({ onOpenChange })
		await user.type(
			await screen.findByLabelText("Nota do treino"),
			"Peito + tríceps 4x12",
		)
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		expect(await screen.findByRole("status")).toHaveTextContent(
			"Esse dia já tem nota — edite a atual",
		)
		expect(screen.getByLabelText("Nota do treino")).toHaveValue(
			"Peito + tríceps 4x12",
		)
		expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument()
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
		expect(toast.error).not.toHaveBeenCalled()
	})
})
