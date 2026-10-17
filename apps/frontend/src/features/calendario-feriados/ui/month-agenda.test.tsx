import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { Feriado } from "@/features/calendario-feriados/model/feriado"
import { criarNotaMock } from "@/test/msw/training-notes-mock"
import { MonthAgenda, type MonthAgendaProps } from "./month-agenda"

const FERIADO_12: Feriado = {
	date: "2026-10-12",
	name: "Nossa Senhora Aparecida",
	type: "national",
	isNational: true,
}

function renderAgenda(props: Partial<MonthAgendaProps> = {}) {
	return render(
		<MonthAgenda
			feriados={[]}
			notas={[]}
			selectedDate="2026-10-12"
			onSelectDay={vi.fn()}
			notasStatus="ok"
			feriadosStatus="ok"
			onRetryNotas={vi.fn()}
			onRetryFeriados={vi.fn()}
			{...props}
		/>,
	)
}

describe("MonthAgenda", () => {
	test("AC-12 feriados e notas aparecem juntos em ordem cronológica, feriado antes da nota no mesmo dia", () => {
		renderAgenda({
			feriados: [FERIADO_12],
			notas: [
				criarNotaMock("2026-10-20", "Pernas"),
				criarNotaMock("2026-10-12", "treino com os irmãos"),
				criarNotaMock("2026-10-05", "Costas 5x5"),
			],
		})
		const linhas = within(
			screen.getByTestId("month-agenda-lista"),
		).getAllByRole("button")
		expect(linhas.map((l) => l.getAttribute("aria-label"))).toEqual([
			"Selecionar 5 de outubro (nota)",
			"Selecionar 12 de outubro (feriado)",
			"Selecionar 12 de outubro (nota)",
			"Selecionar 20 de outubro (nota)",
		])
	})

	test("AC-11 clicar em uma linha seleciona o dia dela e marca a linha do dia selecionado", async () => {
		const onSelectDay = vi.fn()
		const user = userEvent.setup()
		renderAgenda({
			feriados: [FERIADO_12],
			notas: [criarNotaMock("2026-10-20", "Pernas")],
			selectedDate: "2026-10-12",
			onSelectDay,
		})
		expect(
			screen.getByRole("button", {
				name: "Selecionar 12 de outubro (feriado)",
			}),
		).toHaveAttribute("aria-current", "true")
		await user.click(
			screen.getByRole("button", { name: "Selecionar 20 de outubro (nota)" }),
		)
		expect(onSelectDay).toHaveBeenCalledWith("2026-10-20")
	})

	test("a descrição acessível da linha traz o nome do feriado ou o texto da nota", () => {
		renderAgenda({
			feriados: [FERIADO_12],
			notas: [criarNotaMock("2026-10-20", "Pernas")],
		})
		expect(
			screen.getByRole("button", {
				name: "Selecionar 12 de outubro (feriado)",
			}),
		).toHaveAccessibleDescription("Nossa Senhora Aparecida")
		expect(
			screen.getByRole("button", { name: "Selecionar 20 de outubro (nota)" }),
		).toHaveAccessibleDescription("Pernas")
	})

	test("AC-10 com 30 notas a lista rola por dentro (contêiner com overflow-y-auto e altura mínima que impede o colapso)", () => {
		const notas = Array.from({ length: 30 }, (_, i) =>
			criarNotaMock(
				`2026-10-${String(i + 1).padStart(2, "0")}`,
				`nota ${i + 1}`,
			),
		)
		renderAgenda({ notas })
		const lista = screen.getByTestId("month-agenda-lista")
		expect(lista).toHaveClass("overflow-y-auto", "min-h-32", "flex-1")
		expect(lista).not.toHaveClass("min-h-0")
		expect(within(lista).getAllByRole("button")).toHaveLength(30)
	})

	test("mostra o rótulo com as contagens do mês", () => {
		renderAgenda({
			feriados: [FERIADO_12],
			notas: [
				criarNotaMock("2026-10-20", "Pernas"),
				criarNotaMock("2026-10-21", "Braço"),
			],
		})
		expect(screen.getByText("No mês · 1 feriado · 2 notas")).toBeInTheDocument()
	})

	test("rótulo usa plural com zero itens", () => {
		renderAgenda()
		expect(
			screen.getByText("No mês · 0 feriados · 0 notas"),
		).toBeInTheDocument()
	})

	test("rótulo omite o segmento da fonte em erro", () => {
		renderAgenda({ feriados: [FERIADO_12], notasStatus: "erro" })
		expect(screen.getByText("No mês · 1 feriado")).toBeInTheDocument()
	})

	test("erro de notas mantém os feriados visíveis e o retry chama só o das notas", async () => {
		const onRetryNotas = vi.fn()
		const onRetryFeriados = vi.fn()
		const user = userEvent.setup()
		renderAgenda({
			feriados: [FERIADO_12],
			notasStatus: "erro",
			onRetryNotas,
			onRetryFeriados,
		})
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível carregar as notas",
		)
		expect(
			screen.getByRole("button", {
				name: "Selecionar 12 de outubro (feriado)",
			}),
		).toBeInTheDocument()
		await user.click(
			screen.getByRole("button", { name: "Tentar de novo (notas)" }),
		)
		expect(onRetryNotas).toHaveBeenCalledTimes(1)
		expect(onRetryFeriados).not.toHaveBeenCalled()
	})

	test("erro de feriados mantém as notas visíveis e o retry chama só o dos feriados", async () => {
		const onRetryNotas = vi.fn()
		const onRetryFeriados = vi.fn()
		const user = userEvent.setup()
		renderAgenda({
			notas: [criarNotaMock("2026-10-20", "Pernas")],
			feriadosStatus: "erro",
			onRetryNotas,
			onRetryFeriados,
		})
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Não foi possível carregar os feriados",
		)
		expect(
			screen.getByRole("button", { name: "Selecionar 20 de outubro (nota)" }),
		).toBeInTheDocument()
		await user.click(
			screen.getByRole("button", { name: "Tentar de novo (feriados)" }),
		)
		expect(onRetryFeriados).toHaveBeenCalledTimes(1)
		expect(onRetryNotas).not.toHaveBeenCalled()
	})

	test("carregando de uma fonte mostra o status e não esconde a outra", () => {
		const { unmount } = renderAgenda({
			notasStatus: "carregando",
			feriados: [FERIADO_12],
		})
		expect(screen.getByRole("status")).toHaveTextContent("Carregando notas")
		expect(
			screen.getByRole("button", {
				name: "Selecionar 12 de outubro (feriado)",
			}),
		).toBeInTheDocument()
		unmount()
		renderAgenda({
			feriadosStatus: "carregando",
			notas: [criarNotaMock("2026-10-20", "Pernas")],
		})
		expect(screen.getByRole("status")).toHaveTextContent("Carregando feriados")
		expect(
			screen.getByRole("button", { name: "Selecionar 20 de outubro (nota)" }),
		).toBeInTheDocument()
	})

	test("mês sem feriados nem notas mostra 'Nenhuma nota ou feriado neste mês.'", () => {
		renderAgenda()
		expect(
			screen.getByText("Nenhuma nota ou feriado neste mês."),
		).toBeInTheDocument()
	})

	test("com uma fonte em erro e sem itens não mostra o texto de mês vazio", () => {
		renderAgenda({ notasStatus: "erro" })
		expect(
			screen.queryByText("Nenhuma nota ou feriado neste mês."),
		).not.toBeInTheDocument()
	})

	test("com as duas fontes em erro não mostra o texto de mês vazio", () => {
		renderAgenda({ notasStatus: "erro", feriadosStatus: "erro" })
		expect(screen.getAllByRole("alert")).toHaveLength(2)
		expect(screen.queryByText(/No mês/)).not.toBeInTheDocument()
		expect(
			screen.queryByText("Nenhuma nota ou feriado neste mês."),
		).not.toBeInTheDocument()
	})
})
