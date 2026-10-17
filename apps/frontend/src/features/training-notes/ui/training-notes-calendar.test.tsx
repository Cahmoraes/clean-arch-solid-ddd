import { QueryClient } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import {
	criarNotaMock,
	instalarNotasMock,
} from "@/test/msw/training-notes-mock"
import { renderWithProviders } from "@/test/render"
import { trainingNotesQueryKey } from "../api/use-training-notes"

const SEMENTE = [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")]

const renderPagina = () =>
	renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

const painel = () =>
	screen.getByRole("complementary", { name: "Resumo do mês" })

const botaoDoDia = () =>
	document.querySelector('button[data-date="2026-10-16"]')

describe("Calendário com notas de treino", () => {
	test("salvar pela gaveta mostra a nota no painel e na lista do mês", async () => {
		instalarNotasMock()
		const user = userEvent.setup()
		renderPagina()
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Adicionar nota" }),
		)
		await user.type(
			await screen.findByLabelText("Nota do treino"),
			"Peito + tríceps 4x12",
		)
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() =>
			expect(screen.queryByLabelText("Nota do treino")).not.toBeInTheDocument(),
		)
		// o painel contém o bloco da nota e a linha da lista do mês
		expect(
			await within(painel()).findAllByText("Peito + tríceps 4x12"),
		).toHaveLength(2)
		expect(
			screen.getByRole("button", { name: "Selecionar 16 de outubro (nota)" }),
		).toBeInTheDocument()
	})

	test("AC-08 excluir pelo painel pede confirmação e só remove ao confirmar", async () => {
		instalarNotasMock({ semente: SEMENTE })
		const user = userEvent.setup()
		renderPagina()
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Excluir" }),
		)
		expect(
			await screen.findByRole("alertdialog", { name: "Excluir a nota?" }),
		).toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: "Cancelar" }))
		expect(
			await within(painel()).findByRole("button", { name: "Editar" }),
		).toBeInTheDocument()
		await user.click(within(painel()).getByRole("button", { name: "Excluir" }))
		await user.click(await screen.findByRole("button", { name: "Confirmar" }))
		expect(
			await within(painel()).findByText("Nenhuma nota neste dia."),
		).toBeInTheDocument()
		expect(
			screen.queryByRole("button", { name: "Selecionar 16 de outubro (nota)" }),
		).not.toBeInTheDocument()
	})

	test("AC-08 excluir pela gaveta pede confirmação, fecha a gaveta e o painel fica sem nota", async () => {
		instalarNotasMock({ semente: SEMENTE })
		const user = userEvent.setup()
		renderPagina()
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Editar" }),
		)
		await user.click(await screen.findByRole("button", { name: "Excluir" }))
		expect(
			await screen.findByRole("alertdialog", { name: "Excluir a nota?" }),
		).toBeInTheDocument()
		expect(screen.getByLabelText("Nota do treino")).toBeInTheDocument() // a gaveta segue aberta por baixo
		await user.click(screen.getByRole("button", { name: "Confirmar" }))
		await waitFor(() =>
			expect(screen.queryByLabelText("Nota do treino")).not.toBeInTheDocument(),
		)
		expect(
			await within(painel()).findByText("Nenhuma nota neste dia."),
		).toBeInTheDocument()
	})

	test.each([
		[
			"Cancelar",
			(user: UserEvent) =>
				user.click(screen.getByRole("button", { name: "Cancelar" })),
		],
		[
			"X",
			(user: UserEvent) =>
				user.click(screen.getByRole("button", { name: "Close" })),
		],
		["Esc", (user: UserEvent) => user.keyboard("{Escape}")],
		[
			"salvar",
			async (user: UserEvent) => {
				await user.type(screen.getByLabelText("Nota do treino"), "Costas 5x5")
				await user.click(screen.getByRole("button", { name: "Salvar" }))
			},
		],
	])("AC-09 o foco volta ao botão do dia ao fechar a gaveta por %s", async (_nome, fechar) => {
		instalarNotasMock()
		const user = userEvent.setup()
		renderPagina()
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Adicionar nota" }),
		)
		await screen.findByLabelText("Nota do treino")
		await fechar(user)
		await waitFor(() => expect(botaoDoDia()).toHaveFocus())
	})

	test("AC-09 o foco volta ao botão do dia ao excluir pela gaveta", async () => {
		instalarNotasMock({ semente: SEMENTE })
		const user = userEvent.setup()
		renderPagina()
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Editar" }),
		)
		await user.click(await screen.findByRole("button", { name: "Excluir" }))
		await user.click(await screen.findByRole("button", { name: "Confirmar" }))
		await waitFor(() =>
			expect(screen.queryByLabelText("Nota do treino")).not.toBeInTheDocument(),
		)
		await waitFor(() => expect(botaoDoDia()).toHaveFocus())
	})

	test("AC-09 excluir pelo painel devolve o foco ao botão do dia mesmo com o botão Excluir desmontado", async () => {
		instalarNotasMock({ semente: SEMENTE })
		const user = userEvent.setup()
		renderPagina()
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Excluir" }),
		)
		await user.click(await screen.findByRole("button", { name: "Confirmar" }))
		await waitFor(() =>
			expect(
				within(painel()).queryByRole("button", { name: "Excluir" }),
			).not.toBeInTheDocument(),
		)
		expect(
			within(painel()).getByText("Nenhuma nota neste dia."),
		).toBeInTheDocument()
		expect(botaoDoDia()).toHaveFocus() // asserção feita depois que o botão Excluir já sumiu
	})

	test.each([
		[
			"Cancelar",
			(user: UserEvent) =>
				user.click(screen.getByRole("button", { name: "Cancelar" })),
		],
		["Esc", (user: UserEvent) => user.keyboard("{Escape}")],
	])("AC-09 dispensar a exclusão por %s a partir do painel devolve o foco ao botão Excluir do painel", async (_nome, dispensar) => {
		instalarNotasMock({ semente: SEMENTE })
		const user = userEvent.setup()
		renderPagina()
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		const excluir = await within(painel()).findByRole("button", {
			name: "Excluir",
		})
		await user.click(excluir)
		await screen.findByRole("alertdialog", { name: "Excluir a nota?" })
		await dispensar(user)
		await waitFor(() =>
			expect(
				screen.queryByRole("alertdialog", { name: "Excluir a nota?" }),
			).not.toBeInTheDocument(),
		)
		await waitFor(() => expect(excluir).toHaveFocus())
	})

	test.each([
		[
			"Cancelar",
			(user: UserEvent) =>
				user.click(screen.getByRole("button", { name: "Cancelar" })),
		],
		["Esc", (user: UserEvent) => user.keyboard("{Escape}")],
	])("AC-09 dispensar a exclusão por %s a partir da gaveta devolve o foco ao botão Excluir da gaveta", async (_nome, dispensar) => {
		instalarNotasMock({ semente: SEMENTE })
		const user = userEvent.setup()
		renderPagina()
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Editar" }),
		)
		const gaveta = await screen.findByRole("dialog")
		const excluir = within(gaveta).getByRole("button", { name: "Excluir" })
		await user.click(excluir)
		await screen.findByRole("alertdialog", { name: "Excluir a nota?" })
		await dispensar(user)
		await waitFor(() =>
			expect(
				screen.queryByRole("alertdialog", { name: "Excluir a nota?" }),
			).not.toBeInTheDocument(),
		)
		expect(screen.getByLabelText("Nota do treino")).toBeInTheDocument()
		await waitFor(() => expect(excluir).toHaveFocus())
	})

	test("Review Focus: refetch de notas que falha com dados em cache mantém Editar, Adicionar e Excluir e não mostra erro", async () => {
		instalarNotasMock({ semente: SEMENTE })
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		})
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />, {
			queryClient,
		})
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		expect(
			await within(painel()).findByRole("button", { name: "Excluir" }),
		).toBeInTheDocument()

		server.use(
			http.get(endpoint("/training-notes"), () =>
				HttpResponse.json({ message: "falha" }, { status: 500 }),
			),
		)
		await act(() =>
			queryClient.invalidateQueries({ queryKey: ["training-notes"] }),
		)
		await waitFor(() =>
			expect(
				queryClient.getQueryState(trainingNotesQueryKey(2026, 10))?.status,
			).toBe("error"),
		)

		expect(
			within(painel()).getByRole("button", { name: "Editar" }),
		).toBeInTheDocument()
		expect(
			within(painel()).getByRole("button", { name: "Excluir" }),
		).toBeInTheDocument()
		expect(
			screen.queryByText("Não foi possível carregar as notas"),
		).not.toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: /^20 de outubro/ }))
		expect(
			within(painel()).getByRole("button", { name: "Adicionar nota" }),
		).toBeInTheDocument()
	})
})
