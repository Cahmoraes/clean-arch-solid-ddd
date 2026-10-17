import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import CalendarPage from "@/app/(authenticated)/calendario/page"
import {
	criarNotaMock,
	instalarNotasMock,
} from "@/test/msw/training-notes-mock"
import { renderWithProviders } from "@/test/render"

const painel = () =>
	screen.getByRole("complementary", { name: "Resumo do mês" })
const botaoDoDia = () =>
	document.querySelector('button[data-date="2026-10-16"]')

describe("US-04 editar nota do dia na gaveta", () => {
	test("FR-010/FR-011/FR-014 editar abre com texto atual, atualiza painel, marcador e lista e devolve o foco", async () => {
		instalarNotasMock({
			semente: [criarNotaMock("2026-10-16", "Peito + tríceps 4x12")],
		})
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Editar" }),
		)
		const campo = await screen.findByLabelText("Nota do treino")
		expect(campo).toHaveValue("Peito + tríceps 4x12")
		expect(screen.getByRole("dialog")).toBeInTheDocument()
		await user.clear(campo)
		await user.type(campo, "Costas 5x5")
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		await waitFor(() =>
			expect(screen.queryByLabelText("Nota do treino")).not.toBeInTheDocument(),
		)
		expect(await within(painel()).findAllByText("Costas 5x5")).toHaveLength(2)
		expect(
			within(painel()).queryByText("Peito + tríceps 4x12"),
		).not.toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Selecionar 16 de outubro (nota)" }),
		).toBeInTheDocument()
		await waitFor(() => expect(botaoDoDia()).toHaveFocus())
	})

	test("FR-012 conflito 409 ao criar troca para edição com aviso e mantém a gaveta aberta", async () => {
		instalarNotasMock({ forcar409NaCriacao: true })
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Adicionar nota" }),
		)
		await user.type(await screen.findByLabelText("Nota do treino"), "Pernas")
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		expect(await screen.findByRole("status")).toHaveTextContent(/já tem nota/i)
		expect(screen.getByLabelText("Nota do treino")).toHaveValue("Pernas")
		expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument()
	})

	test("FR-012 erro de rede ao salvar mantém rascunho e mostra Repetir", async () => {
		instalarNotasMock({ criacaoComErroDeRede: true })
		const user = userEvent.setup()
		renderWithProviders(<CalendarPage initialYear={2026} initialMonth={9} />)
		await user.click(
			await screen.findByRole("button", { name: /^16 de outubro/ }),
		)
		await user.click(
			await within(painel()).findByRole("button", { name: "Adicionar nota" }),
		)
		await user.type(await screen.findByLabelText("Nota do treino"), "Ombros")
		await user.click(screen.getByRole("button", { name: "Salvar" }))
		expect(
			await screen.findByRole("button", { name: "Repetir" }),
		).toBeInTheDocument()
		expect(screen.getByLabelText("Nota do treino")).toHaveValue("Ombros")
	})
})
