import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"

vi.mock("sonner", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from "sonner"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import {
	criarNotaMock,
	instalarNotasMock,
} from "@/test/msw/training-notes-mock"
import { renderWithProviders } from "@/test/render"

describe("US-02 editar a nota do dia", () => {
	test("FR-002 abre em modo edição e salvar atualiza a barrinha e a lista", async () => {
		instalarNotasMock({
			semente: [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")],
		})
		vi.mocked(toast.success).mockClear()
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

		await user.click(await screen.findByTestId("nota-bar-2026-10-16"))

		expect(
			screen.getByText(/edite o texto da nota ou exclua/i),
		).toBeInTheDocument()
		expect(screen.getByLabelText(/nota do treino/i)).toHaveValue(
			"Peito + tríceps 4x12",
		)

		await user.clear(screen.getByLabelText(/nota do treino/i))
		await user.type(screen.getByLabelText(/nota do treino/i), "Costas 5x5")
		await user.click(screen.getByRole("button", { name: /salvar/i }))

		await waitFor(() =>
			expect(toast.success).toHaveBeenCalledWith("Nota atualizada."),
		)
		expect(
			await screen.findByTestId("nota-bar-2026-10-16"),
		).toBeInTheDocument()
		const lista = screen.getByRole("region", { name: /minhas notas/i })
		expect(await within(lista).findByText(/Costas 5x5/)).toBeInTheDocument()
		expect(
			within(lista).queryByText(/Peito \+ tríceps 4x12/),
		).not.toBeInTheDocument()
	})

	test("FR-009 editar nota inexistente (PUT 404) avisa sem efeito colateral", async () => {
		instalarNotasMock({
			semente: [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")],
		})
		server.use(
			http.put(endpoint("/training-notes/:date"), () =>
				HttpResponse.json(
					{ message: "Nota não encontrada — recarregue o mês" },
					{ status: 404 },
				),
			),
		)
		vi.mocked(toast.error).mockClear()
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)

		await user.click(await screen.findByTestId("nota-bar-2026-10-16"))
		await user.clear(screen.getByLabelText(/nota do treino/i))
		await user.type(screen.getByLabelText(/nota do treino/i), "Costas 5x5")
		await user.click(screen.getByRole("button", { name: /salvar/i }))

		expect(
			await screen.findByText(/nota não encontrada — recarregue o mês/i),
		).toBeInTheDocument()
		expect(screen.getByLabelText(/nota do treino/i)).toHaveValue("Costas 5x5")
		expect(screen.getByTestId("nota-bar-2026-10-16")).toBeInTheDocument()
		const lista = screen.getByRole("region", { name: /minhas notas/i })
		expect(
			within(lista).getByText(/Peito \+ tríceps 4x12/),
		).toBeInTheDocument()
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Nota não encontrada — recarregue o mês",
			),
		)
	})
})
