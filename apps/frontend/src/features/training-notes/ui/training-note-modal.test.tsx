import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import {
	criarNotaMock,
	instalarNotasMock,
} from "@/test/msw/training-notes-mock"
import { renderWithProviders } from "@/test/render"

describe("Modal da nota de treino", () => {
	test("AC-04 texto vazio mostra erro e nada é apagado", async () => {
		const aoAtualizar = vi.fn()
		instalarNotasMock({
			semente: [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")],
			aoAtualizar,
		})
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

		await user.click(await screen.findByTestId("nota-bar-2026-10-16"))
		await user.clear(screen.getByLabelText(/nota do treino/i))
		await user.click(screen.getByRole("button", { name: /salvar/i }))

		expect(await screen.findByText(/1 a 500 caracteres/)).toBeInTheDocument()
		expect(screen.getByLabelText(/nota do treino/i)).toBeInTheDocument()
		expect(screen.getByTestId("nota-bar-2026-10-16")).toBeInTheDocument()
		expect(aoAtualizar).not.toHaveBeenCalled()
	})

	test("409 na criação troca o modal para edição com aviso", async () => {
		instalarNotasMock({ forcar409NaCriacao: true })
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

		expect(await screen.findByText(/já tem nota.*edite/i)).toBeInTheDocument()
		expect(screen.queryByText(/algo deu errado/i)).not.toBeInTheDocument()
	})

	test("AC-06 rede falha mantém o rascunho com retry visível", async () => {
		const loja = instalarNotasMock({ criacaoComErroDeRede: true })
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

		await user.click(
			await screen.findByRole("button", { name: /17 de outubro/i }),
		)
		await user.type(screen.getByLabelText(/nota do treino/i), "Costas 5x5")
		await user.click(screen.getByRole("button", { name: /salvar/i }))

		expect(await screen.findByText(/sem conexão/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/nota do treino/i)).toHaveValue("Costas 5x5")
		expect(screen.getByRole("button", { name: /repetir/i })).toBeInTheDocument()

		server.use(
			http.post(endpoint("/training-notes"), async ({ request }) => {
				const corpo = (await request.json().catch(() => ({}))) as {
					data?: string
					texto?: string
				}
				const nota = {
					data: corpo.data ?? "",
					texto: corpo.texto ?? "",
					atualizadoEm: new Date().toISOString(),
				}
				loja.salvar(nota)
				return HttpResponse.json({ id: "nota-teste", ...nota }, { status: 201 })
			}),
		)
		await user.click(screen.getByRole("button", { name: /repetir/i }))
		await waitFor(() =>
			expect(screen.queryByTestId("nota-bar-2026-10-17")).toBeInTheDocument(),
		)
	})
})
