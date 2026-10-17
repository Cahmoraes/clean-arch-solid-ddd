import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { Feriado } from "@/features/calendario-feriados/model/feriado"
import { criarNotaMock } from "@/test/msw/training-notes-mock"
import { DayDetailPanel, type DayDetailPanelProps } from "./day-detail-panel"

const FERIADO: Feriado = {
	date: "2026-10-12",
	name: "Nossa Senhora Aparecida",
	type: "national",
	isNational: true,
}
const NOTA = criarNotaMock("2026-10-12", "treino com os irmãos")

function renderPainel(props: Partial<DayDetailPanelProps> = {}) {
	return render(
		<DayDetailPanel
			date="2026-10-12"
			notasStatus="ok"
			feriadosStatus="ok"
			onOpenNote={vi.fn()}
			onRetryNotas={vi.fn()}
			onRetryFeriados={vi.fn()}
			{...props}
		/>,
	)
}

describe("DayDetailPanel", () => {
	test("o texto da nota quebra linhas e palavras longas, sem altura limitada nem rolagem", () => {
		const texto = `${"a".repeat(500)}\nsegunda linha`
		renderPainel({ nota: criarNotaMock("2026-10-12", texto) })
		const elemento = screen.getByText(
			(_conteudo, el) => el?.tagName === "SPAN" && el.textContent === texto,
		)
		expect(elemento).toHaveClass("break-words", "whitespace-pre-line")
		expect(elemento).not.toHaveClass("max-h-40")
		expect(elemento).not.toHaveClass("overflow-y-auto")
	})

	test("AC-01 a nota longa é cortada em 3 linhas sem rolagem e o texto completo segue no DOM", () => {
		const longo = "treino com os irmãos ".repeat(30).trim()
		renderPainel({ nota: criarNotaMock("2026-10-12", longo) })
		const trecho = screen.getByText(longo)
		expect(trecho).toHaveClass("line-clamp-3")
		expect(trecho).not.toHaveClass("overflow-y-auto")
		expect(trecho).not.toHaveClass("max-h-40")
	})

	test("Review Focus: palavra única longa sem espaços fica em 3 linhas e quebra no cartão", () => {
		const palavra = "a".repeat(300)
		renderPainel({ nota: criarNotaMock("2026-10-12", palavra) })
		expect(screen.getByText(palavra)).toHaveClass("line-clamp-3", "break-words")
	})

	test("AC-02 o painel não tem os botões Editar nem Excluir e o trecho abre a nota", async () => {
		const onOpenNote = vi.fn()
		const user = userEvent.setup()
		renderPainel({ nota: NOTA, onOpenNote })
		expect(
			screen.queryByRole("button", { name: "Editar" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Excluir" }),
		).not.toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: /Ver nota completa/ }))
		expect(onOpenNote).toHaveBeenCalledTimes(1)
	})

	test("o trecho da nota é um botão cujo nome acessível é o texto da nota e 'Ver nota completa'", () => {
		renderPainel({ nota: NOTA })
		expect(
			screen.getByRole("button", {
				name: "treino com os irmãos Ver nota completa",
			}),
		).toBeInTheDocument()
	})

	test("AC-04 dia com feriado e nota mostra os dois blocos, sem Editar nem Excluir", () => {
		renderPainel({ feriado: FERIADO, nota: NOTA })
		const painel = screen.getByRole("complementary", { name: "Resumo do mês" })
		expect(
			within(painel).getByRole("heading", { level: 2, name: "12 de outubro" }),
		).toBeInTheDocument()
		expect(within(painel).getByText("segunda-feira")).toBeInTheDocument()
		expect(within(painel).getByText(/feriado nacional/i)).toBeInTheDocument()
		expect(
			within(painel).getByText("Nossa Senhora Aparecida"),
		).toBeInTheDocument()
		expect(within(painel).getByText("treino com os irmãos")).toBeInTheDocument()
		expect(
			within(painel).getByRole("button", { name: /Ver nota completa/ }),
		).toBeInTheDocument()
		expect(
			within(painel).queryByRole("button", { name: "Editar" }),
		).not.toBeInTheDocument()
		expect(
			within(painel).queryByRole("button", { name: "Excluir" }),
		).not.toBeInTheDocument()
	})

	test("AC-05 dia sem nota mostra 'Nenhuma nota neste dia.' e Adicionar nota, sem Editar nem Excluir", () => {
		renderPainel()
		expect(screen.getByText("Nenhuma nota neste dia.")).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Adicionar nota" }),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Editar" }),
		).not.toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Excluir" }),
		).not.toBeInTheDocument()
		expect(screen.queryByText(/feriado nacional/i)).not.toBeInTheDocument()
	})

	test("Adicionar nota chama onOpenNote", async () => {
		const onOpenNote = vi.fn()
		const user = userEvent.setup()
		renderPainel({ onOpenNote })
		expect(screen.getByText("Nenhuma nota neste dia.")).toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: "Adicionar nota" }))
		expect(onOpenNote).toHaveBeenCalledTimes(1)
	})

	test("erro de notas mostra a mensagem com retry, esconde as ações e mantém o feriado", async () => {
		const onRetryNotas = vi.fn()
		const user = userEvent.setup()
		renderPainel({ feriado: FERIADO, notasStatus: "erro", onRetryNotas })
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível carregar as notas",
		)
		expect(screen.getByText("Nossa Senhora Aparecida")).toBeInTheDocument()
		for (const nome of ["Editar", "Excluir", "Adicionar nota"]) {
			expect(
				screen.queryByRole("button", { name: nome }),
			).not.toBeInTheDocument()
		}
		await user.click(
			screen.getByRole("button", { name: "Tentar de novo (notas)" }),
		)
		expect(onRetryNotas).toHaveBeenCalledTimes(1)
	})

	test("carregando notas mostra 'Carregando notas' e esconde as ações", () => {
		renderPainel({ notasStatus: "carregando" })
		expect(screen.getByRole("status")).toHaveTextContent("Carregando notas")
		expect(
			screen.queryByRole("button", { name: "Adicionar nota" }),
		).not.toBeInTheDocument()
	})

	test("erro de feriados mostra a mensagem com retry e mantém o trecho da nota acessível", async () => {
		const onRetryFeriados = vi.fn()
		const user = userEvent.setup()
		renderPainel({ nota: NOTA, feriadosStatus: "erro", onRetryFeriados })
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível carregar os feriados",
		)
		expect(screen.getByText("treino com os irmãos")).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: /Ver nota completa/ }),
		).toBeInTheDocument()
		await user.click(
			screen.getByRole("button", { name: "Tentar de novo (feriados)" }),
		)
		expect(onRetryFeriados).toHaveBeenCalledTimes(1)
	})

	test("carregando feriados mostra 'Carregando feriados' sem esconder a nota", () => {
		renderPainel({ nota: NOTA, feriadosStatus: "carregando" })
		expect(screen.getByRole("status")).toHaveTextContent("Carregando feriados")
		expect(screen.getByText("treino com os irmãos")).toBeInTheDocument()
	})

	test("renderiza os filhos abaixo dos blocos do dia", () => {
		renderPainel({ children: <p>lista do mês</p> })
		expect(screen.getByText("lista do mês")).toBeInTheDocument()
	})

	test("className recebido é aplicado na raiz complementary sem perder o landmark", () => {
		renderPainel({ className: "xl:h-0 xl:min-h-full" })
		const painel = screen.getByRole("complementary", { name: "Resumo do mês" })
		expect(painel).toHaveClass("gap-4", "xl:h-0", "xl:min-h-full")
	})

	test("AC-07 o cartão contém o que transborda: raiz com min-h-0 e overflow-hidden", () => {
		renderPainel()
		const painel = screen.getByRole("complementary", { name: "Resumo do mês" })
		expect(painel).toHaveClass("min-h-0", "overflow-hidden")
	})
})
