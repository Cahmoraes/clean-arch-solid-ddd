import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import {
	criarNotaMock,
	instalarNotasMock,
} from "@/test/msw/training-notes-mock"
import { renderWithProviders } from "@/test/render"

describe("Calendário com notas de treino", () => {
	test("AC-01 salvar a nota exibe a barrinha e inclui o dia na lista da semana", async () => {
		instalarNotasMock()
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

		await user.click(
			await screen.findByRole("button", { name: /16 de outubro/i }),
		)
		await user.type(
			screen.getByLabelText(/nota do treino/i),
			"Peito + tríceps 4x12",
		)
		await user.click(screen.getByRole("button", { name: /salvar/i }))

		expect(await screen.findByTestId("nota-bar-2026-10-16")).toBeInTheDocument()
		const lista = screen.getByRole("region", { name: /minhas notas/i })
		expect(within(lista).getByText(/semana 3/i)).toBeInTheDocument()
		expect(within(lista).getByText(/16 de outubro/)).toBeInTheDocument()
	})

	test("AC-02 dia com nota e feriado mostra o nome do feriado mais a nota", async () => {
		instalarNotasMock({
			feriados: [
				{
					date: "2026-10-12",
					name: "Nossa Senhora Aparecida",
					type: "national",
				},
			],
			semente: [criarNotaMock("2026-10-12", "Leve + mobilidade")],
		})
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

		await screen.findAllByText(/Nossa Senhora Aparecida/)
		const bar = await screen.findByTestId("nota-bar-2026-10-12")
		const celula = bar.closest("button")
		expect(celula).not.toBeNull()
		expect(celula).toHaveTextContent(/Nossa Senhora Aparecida/)
		expect(celula).toHaveTextContent(/Leve \+ mobilidade/)
	})

	test("AC-03 confirmar a exclusão some a nota da célula e da lista", async () => {
		instalarNotasMock({
			semente: [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")],
		})
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

		await user.click(await screen.findByTestId("nota-bar-2026-10-16"))
		await user.click(screen.getByRole("button", { name: /excluir/i }))
		await user.click(screen.getByRole("button", { name: /confirmar/i }))

		await waitFor(() =>
			expect(
				screen.queryByTestId("nota-bar-2026-10-16"),
			).not.toBeInTheDocument(),
		)
		const lista = screen.getByRole("region", { name: /minhas notas/i })
		expect(
			within(lista).queryByText(/Peito \+ tríceps 4x12/),
		).not.toBeInTheDocument()
	})

	test("AC-09 feriados falham e as notas seguem visíveis com retry nos feriados", async () => {
		instalarNotasMock({
			feriadosComErro: true,
			semente: [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")],
		})
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

		expect(
			await screen.findByTestId("nota-bar-2026-10-16", undefined, {
				timeout: 5_000,
			}),
		).toBeInTheDocument()
		expect(
			await screen.findByRole(
				"button",
				{ name: /tentar novamente/i },
				{ timeout: 5_000 },
			),
		).toBeInTheDocument()
		expect(screen.getByRole("alert")).toHaveTextContent(
			/não foi possível carregar os feriados/i,
		)
	})
})
