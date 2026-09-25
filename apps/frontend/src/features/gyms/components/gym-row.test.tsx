import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { renderWithProviders } from "@/test/render"
import { GymRow } from "./gym-row"

const gym: Gym = {
	id: "g1",
	title: "VOLT Centro",
	description: "Academia completa",
	phone: null,
	address: "Rua A, 100",
	imageKey: "gyms/volt.webp",
	latitude: -23.5,
	longitude: -46.6,
	status: "activated",
}

describe("GymRow VOLT", () => {
	test("exibe o nome da academia", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("VOLT Centro")).toBeInTheDocument()
	})

	test("expõe a linha como link navegável para o detalhe", () => {
		renderWithProviders(<GymRow gym={gym} />)
		const link = screen.getByTestId("gym-row-g1")
		expect(link).toHaveAttribute("href", "/academias/g1")
	})

	test("exibe imagem, nome, descrição e endereço da academia", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("VOLT Centro")).toBeInTheDocument()
		expect(screen.getByText("Academia completa")).toBeInTheDocument()
		expect(screen.getByText("Rua A, 100")).toBeInTheDocument()
	})

	test("não exibe telefone nem 'Ver detalhes', com ou sem telefone", () => {
		const { unmount } = renderWithProviders(
			<GymRow gym={{ ...gym, phone: "(11) 99999-0000" }} />,
		)
		expect(screen.queryByText("(11) 99999-0000")).not.toBeInTheDocument()
		expect(screen.queryByText("Ver detalhes")).not.toBeInTheDocument()
		unmount()
		renderWithProviders(<GymRow gym={{ ...gym, phone: null }} />)
		expect(screen.queryByText("Ver detalhes")).not.toBeInTheDocument()
	})

	test("não exibe selo de texto de status nem a pílula Check-in", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.queryByText("Disponível")).not.toBeInTheDocument()
		expect(screen.queryByText("Check-in")).not.toBeInTheDocument()
	})

	test("indica disponibilidade com ponto verde nomeado, antes do nome", () => {
		renderWithProviders(<GymRow gym={gym} />)
		const dot = screen.getByRole("img", { name: "Disponível" })
		expect(dot).toHaveAttribute("title", "Disponível")
		expect(dot).toHaveClass("bg-success")
		expect(screen.getByText("VOLT Centro")).toContainElement(dot)
	})

	test("indica 'Desativada' com ponto vermelho quando admin e status desativado", () => {
		const deactivatedGym: Gym = { ...gym, status: "deactivated" }
		renderWithProviders(
			<GymRow
				gym={deactivatedGym}
				adminEditHref="/admin/academias/g1/editar"
			/>,
		)
		const dot = screen.getByRole("img", { name: "Desativada" })
		expect(dot).toHaveClass("bg-destructive")
		expect(
			screen.queryByRole("img", { name: "Disponível" }),
		).not.toBeInTheDocument()
	})

	test("sem adminEditHref, mesmo desativada, indica 'Disponível'", () => {
		const deactivatedGym: Gym = { ...gym, status: "deactivated" }
		renderWithProviders(<GymRow gym={deactivatedGym} />)
		expect(screen.getByRole("img", { name: "Disponível" })).toHaveClass(
			"bg-success",
		)
		expect(
			screen.queryByRole("img", { name: "Desativada" }),
		).not.toBeInTheDocument()
	})

	test("a linha realça no hover por token", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByTestId("gym-row-g1")).toHaveClass("hover:bg-surface-2")
	})

	test("não exibe o botão de edição quando adminEditHref não é informado", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.queryByTestId("gym-row-edit-g1")).not.toBeInTheDocument()
	})

	test("exibe o botão de edição com href correto quando adminEditHref é informado", () => {
		renderWithProviders(
			<GymRow gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		const editLink = screen.getByTestId("gym-row-edit-g1")
		expect(editLink).toBeInTheDocument()
		expect(editLink).toHaveAttribute("href", "/admin/academias/g1/editar")
	})

	test("o botão de editar do admin destaca em ciano no hover", () => {
		renderWithProviders(
			<GymRow gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		const edit = screen.getByTestId("gym-row-edit-g1")
		expect(edit).toHaveClass("hover:text-accent")
		expect(edit).not.toHaveClass("hover:text-primary")
	})
})
