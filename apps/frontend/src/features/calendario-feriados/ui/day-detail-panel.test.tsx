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
			onEdit={vi.fn()}
			onDelete={vi.fn()}
			onRetryNotas={vi.fn()}
			onRetryFeriados={vi.fn()}
			{...props}
		/>,
	)
}

describe("DayDetailPanel", () => {
	test("AC-04 dia com feriado e nota mostra os dois blocos com Editar e Excluir", () => {
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
			within(painel).getByRole("button", { name: "Editar" }),
		).toBeInTheDocument()
		expect(
			within(painel).getByRole("button", { name: "Excluir" }),
		).toBeInTheDocument()
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

	test("Editar, Excluir e Adicionar nota chamam os callbacks", async () => {
		const onEdit = vi.fn()
		const onDelete = vi.fn()
		const user = userEvent.setup()
		const { unmount } = renderPainel({ nota: NOTA, onEdit, onDelete })
		await user.click(screen.getByRole("button", { name: "Editar" }))
		await user.click(screen.getByRole("button", { name: "Excluir" }))
		expect(onEdit).toHaveBeenCalledTimes(1)
		expect(onDelete).toHaveBeenCalledTimes(1)
		unmount()
		const onAdd = vi.fn()
		renderPainel({ onEdit: onAdd })
		await user.click(screen.getByRole("button", { name: "Adicionar nota" }))
		expect(onAdd).toHaveBeenCalledTimes(1)
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

	test("erro de feriados mostra a mensagem com retry e mantém a nota editável", async () => {
		const onRetryFeriados = vi.fn()
		const user = userEvent.setup()
		renderPainel({ nota: NOTA, feriadosStatus: "erro", onRetryFeriados })
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível carregar os feriados",
		)
		expect(screen.getByText("treino com os irmãos")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
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
})
