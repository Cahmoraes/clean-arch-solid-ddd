import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { renderWithProviders } from "@/test/render"
import AdminNovoAvisoPage from "./page"

describe("AdminNovoAvisoPage", () => {
	test("renderiza o cabeçalho com eyebrow Admin, título e subtítulo", () => {
		renderWithProviders(<AdminNovoAvisoPage />)

		expect(screen.getByText("Admin")).toBeInTheDocument()
		expect(
			screen.getByRole("heading", { level: 1, name: "Novo aviso" }),
		).toBeInTheDocument()
		expect(
			screen.getByText(
				"Comunicado enviado ao público escolhido pelo sino de notificações.",
			),
		).toBeInTheDocument()
	})

	test("renderiza o formulário e a pré-visualização lado a lado", () => {
		renderWithProviders(<AdminNovoAvisoPage />)

		expect(
			screen.getByRole("form", { name: "Formulário de novo aviso" }),
		).toBeInTheDocument()
		expect(screen.getByText("Como o usuário verá")).toBeInTheDocument()
		expect(
			screen.getByRole("button", { name: "Enviar aviso" }),
		).toBeInTheDocument()
	})
})
