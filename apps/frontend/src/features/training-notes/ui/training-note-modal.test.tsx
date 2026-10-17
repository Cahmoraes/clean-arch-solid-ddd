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
import { NoteModal, type NoteModalProps } from "./training-note-modal"

const DATA = "2026-10-16"

function renderModal(props: Partial<NoteModalProps> = {}) {
	return renderWithProviders(
		<NoteModal
			open
			date={DATA}
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

describe("NoteModal", () => {
	test("AC-02 abre em modo edição com o texto completo no campo e o foco inicial no campo", async () => {
		const texto = "treino com os irmãos ".repeat(14).trim()
		renderModal({ initialTexto: texto })
		expect(await screen.findByRole("dialog")).toBeInTheDocument()
		const campo = screen.getByLabelText("Nota do treino")
		expect(campo).toHaveValue(texto)
		expect(campo).toHaveFocus()
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
	})

	test("AC-03 ao criar abre vazio e sem o botão Excluir", async () => {
		renderModal({})
		await screen.findByRole("dialog")
		expect(screen.getByLabelText("Nota do treino")).toHaveValue("")
		expect(
			screen.queryByRole("button", { name: "Excluir" }),
		).not.toBeInTheDocument()
	})

	test("o título mostra a data e o subtítulo o dia da semana e o feriado", async () => {
		renderModal({ date: "2026-10-12", feriadoNome: "Nossa Senhora Aparecida" })
		expect(
			await screen.findByRole("heading", { name: "12 de outubro" }),
		).toBeInTheDocument()
		expect(
			screen.getByText("segunda-feira · Nossa Senhora Aparecida"),
		).toBeInTheDocument()
	})

	test("AC-04 salvar com texto válido grava a nota e fecha o modal", async () => {
		const { criou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ onOpenChange })
		await user.type(
			await screen.findByLabelText("Nota do treino"),
			"Peito + tríceps 4x12",
		)
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		expect(criou).toHaveBeenCalledWith({
			data: DATA,
			texto: "Peito + tríceps 4x12",
		})
		expect(toast.success).toHaveBeenCalledWith("Nota salva.")
	})

	test("AC-04 salvar em modo edição atualiza a nota e fecha o modal", async () => {
		const { atualizou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ initialTexto: "antigo", onOpenChange })
		const campo = await screen.findByLabelText("Nota do treino")
		await user.clear(campo)
		await user.type(campo, "novo")
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		expect(atualizou).toHaveBeenCalledWith(
			DATA,
			expect.objectContaining({ texto: "novo" }),
		)
	})

	test("AC-04 Cancelar fecha sem gravar", async () => {
		const { criou, atualizou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ onOpenChange })
		await user.type(await screen.findByLabelText("Nota do treino"), "rascunho")
		await user.click(screen.getByRole("button", { name: "Cancelar" }))
		expect(onOpenChange).toHaveBeenCalledWith(false)
		expect(criou).not.toHaveBeenCalled()
		expect(atualizou).not.toHaveBeenCalled()
	})

	test("AC-05 Excluir pede a exclusão sem apagar nem fechar", async () => {
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
		renderModal({ initialTexto: "x", onRequestDelete, onOpenChange })
		await user.click(await screen.findByRole("button", { name: "Excluir" }))
		expect(onRequestDelete).toHaveBeenCalledWith(DATA)
		expect(apagou).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	test("AC-06 Salvar, Cancelar e Excluir são botões só com ícone com nome acessível exato", async () => {
		renderModal({ initialTexto: "x" })
		for (const nome of ["Salvar", "Cancelar", "Excluir"]) {
			const botao = await screen.findByRole("button", { name: nome })
			expect(botao.textContent).toBe("")
			expect(botao.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
		}
	})

	test.each([
		"Salvar",
		"Cancelar",
		"Excluir",
	])("AC-06 a ação %s mostra tooltip com o mesmo texto", async (nome) => {
		const user = userEvent.setup()
		renderModal({ initialTexto: "x" })
		await user.hover(await screen.findByRole("button", { name: nome }))
		expect(await screen.findByRole("tooltip")).toHaveTextContent(nome)
	})

	test("AC-06 Repetir continua texto e aparece só após falha de rede ao salvar", async () => {
		instalarNotasMock({ criacaoComErroDeRede: true })
		const user = userEvent.setup()
		renderModal()
		await user.type(await screen.findByLabelText("Nota do treino"), "Costas")
		expect(
			screen.queryByRole("button", { name: "Repetir" }),
		).not.toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		const repetir = await screen.findByRole("button", { name: "Repetir" })
		expect(repetir).toHaveTextContent("Repetir")
	})

	test("AC-08 texto vazio mostra 'Escreva de 1 a 500 caracteres' e não envia", async () => {
		const { criou, atualizou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ onOpenChange })
		await user.click(await screen.findByRole("button", { name: "Salvar" }))
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Escreva de 1 a 500 caracteres",
		)
		expect(criou).not.toHaveBeenCalled()
		expect(atualizou).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	test("AC-08 conflito 409 passa para modo edição com o aviso", async () => {
		vi.mocked(toast.error).mockClear()
		instalarNotasMock({ forcar409NaCriacao: true })
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ onOpenChange })
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

	test("AC-08 falha de rede mantém o texto e oferece Repetir", async () => {
		vi.mocked(toast.error).mockClear()
		instalarNotasMock({ criacaoComErroDeRede: true })
		const user = userEvent.setup()
		renderModal()
		await user.type(
			await screen.findByLabelText("Nota do treino"),
			"Costas 5x5",
		)
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		expect(
			await screen.findByText("Sem conexão — tente de novo"),
		).toBeInTheDocument()
		expect(screen.getByLabelText("Nota do treino")).toHaveValue("Costas 5x5")
		expect(screen.getByRole("button", { name: "Repetir" })).toBeInTheDocument()
		expect(toast.error).toHaveBeenCalledWith("Sem conexão — tente de novo")
	})

	test("AC-08 nota não encontrada (404) mostra o aviso", async () => {
		instalarNotasMock()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ initialTexto: "antigo", onOpenChange })
		const campo = await screen.findByLabelText("Nota do treino")
		await user.clear(campo)
		await user.type(campo, "novo")
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		expect(
			await screen.findByText("Nota não encontrada — recarregue o mês"),
		).toBeInTheDocument()
		expect(campo).toHaveValue("novo")
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	test("o contador mostra n/500 enquanto digita", async () => {
		const user = userEvent.setup()
		renderModal()
		await user.type(await screen.findByLabelText("Nota do treino"), "abc")
		expect(screen.getByText("3/500")).toBeInTheDocument()
	})

	test("salvar envia o texto sem espaços nas pontas", async () => {
		const { criou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ onOpenChange })
		await user.type(
			await screen.findByLabelText("Nota do treino"),
			"  Pernas  ",
		)
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		expect(criou).toHaveBeenCalledWith({ data: DATA, texto: "Pernas" })
	})

	test("Review Focus: texto de 500 caracteres salva e o de 501 é recusado", async () => {
		const { criou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ onOpenChange })
		const campo = await screen.findByLabelText("Nota do treino")
		await user.click(campo)
		await user.paste("a".repeat(500))
		expect(screen.getByText("500/500")).toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
		expect(criou).toHaveBeenCalledWith({ data: DATA, texto: "a".repeat(500) })
	})

	test("Review Focus: 501 caracteres é recusado com o aviso e sem requisição", async () => {
		const { criou, atualizou } = registrarSalvamento()
		const onOpenChange = vi.fn()
		const user = userEvent.setup()
		renderModal({ initialTexto: "a".repeat(501), onOpenChange })
		await user.click(await screen.findByRole("button", { name: "Salvar" }))
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Escreva de 1 a 500 caracteres",
		)
		expect(criou).not.toHaveBeenCalled()
		expect(atualizou).not.toHaveBeenCalled()
		expect(onOpenChange).not.toHaveBeenCalledWith(false)
	})

	test("Review Focus: ao abrir o modal o foco está no campo e nenhum tooltip está aberto", async () => {
		renderModal({ initialTexto: "x" })
		await screen.findByRole("dialog")
		expect(screen.getByLabelText("Nota do treino")).toHaveFocus()
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()
	})
})
