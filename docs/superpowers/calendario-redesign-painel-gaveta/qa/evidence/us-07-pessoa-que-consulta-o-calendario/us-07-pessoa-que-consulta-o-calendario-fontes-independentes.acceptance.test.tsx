import { act, screen, within } from "@testing-library/react"
import { delay, HttpResponse, http } from "msw"
import { describe, expect, test } from "vitest"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import {
	criarNotaMock,
	instalarNotasMock,
} from "@/test/msw/training-notes-mock"
import { renderWithProviders } from "@/test/render"

const BRASIL_API_FERIADOS_URL = "https://brasilapi.com.br/api/feriados/v1"
const FERIADO_12 = {
	date: "2026-10-12",
	name: "Nossa Senhora Aparecida",
	type: "national",
}
const painel = () =>
	screen.getByRole("complementary", { name: "Resumo do mês" })

describe("US-07 fontes independentes (FR-016 / AC-13)", () => {
	test("feriados demorando não escondem a grade nem as notas, que seguem editáveis", async () => {
		instalarNotasMock({
			semente: [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")],
		})
		server.use(
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, async () => {
				await delay("infinite")
				return HttpResponse.json([])
			}),
		)
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
		expect(await screen.findByRole("grid")).toBeInTheDocument()
		expect(
			(await screen.findAllByText("Carregando feriados")).length,
		).toBeGreaterThan(0)
		expect(
			await screen.findByRole("button", {
				name: "Selecionar 16 de outubro (nota)",
			}),
		).toBeInTheDocument()
		expect(screen.queryByText("Carregando notas")).not.toBeInTheDocument()
		expect(
			await within(painel()).findByRole("button", { name: "Adicionar nota" }),
		).toBeInTheDocument()
	})

	test("falha de refetch com dados em cache não esconde feriados nem notas nem as ações de nota", async () => {
		instalarNotasMock({
			semente: [criarNotaMock("2026-10-12", "Treino no feriado")],
			feriados: [FERIADO_12],
		})
		const { queryClient } = renderWithProviders(
			<CalendarPage initialYear={2026} initialMonth={9} />,
		)
		await screen.findByRole("button", {
			name: /^12 de outubro.*Nossa Senhora Aparecida.*nota: Treino no feriado/,
		})
		server.use(
			http.get(endpoint("/training-notes"), () =>
				HttpResponse.json({ message: "falha" }, { status: 500 }),
			),
			http.get(`${BRASIL_API_FERIADOS_URL}/2026`, () =>
				HttpResponse.json({ message: "falha" }, { status: 500 }),
			),
		)
		await act(async () => {
			await queryClient.invalidateQueries()
		})
		expect(queryClient.getQueryState(["feriados", 2026])?.status).toBe("error")
		expect(
			screen.queryByText("Não foi possível carregar as notas"),
		).not.toBeInTheDocument()
		expect(
			screen.queryByText("Não foi possível carregar os feriados"),
		).not.toBeInTheDocument()
		expect(screen.getByRole("grid")).toBeInTheDocument()
		expect(
			screen.getByRole("button", {
				name: /^12 de outubro.*Nossa Senhora Aparecida.*nota: Treino no feriado/,
			}),
		).toBeInTheDocument()
	})
})
