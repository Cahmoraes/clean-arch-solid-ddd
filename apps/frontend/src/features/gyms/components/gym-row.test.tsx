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

	test("usa a localização disponível como meta", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Rua A, 100")).toBeInTheDocument()
	})

	test("exibe a descrição quando presente", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Academia completa")).toBeInTheDocument()
	})

	test('exibe "Ver detalhes" quando o telefone está ausente', () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Ver detalhes")).toBeInTheDocument()
	})

	test("exibe o telefone quando presente", () => {
		renderWithProviders(<GymRow gym={{ ...gym, phone: "(11) 99999-0000" }} />)
		expect(screen.getByText("(11) 99999-0000")).toBeInTheDocument()
	})

	test("exibe o pill de disponibilidade", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Disponível")).toBeInTheDocument()
	})

	test("exibe o CTA de check-in", () => {
		renderWithProviders(<GymRow gym={gym} />)
		expect(screen.getByText("Check-in")).toBeInTheDocument()
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

	test("mostra o selo 'Desativada' quando a academia está desativada e adminEditHref é informado", () => {
		const deactivatedGym: Gym = { ...gym, status: "deactivated" }
		renderWithProviders(
			<GymRow
				gym={deactivatedGym}
				adminEditHref="/admin/academias/g1/editar"
			/>,
		)
		expect(screen.getByText("Desativada")).toBeInTheDocument()
		expect(screen.queryByText("Disponível")).not.toBeInTheDocument()
	})

	test("não mostra o selo 'Desativada' sem adminEditHref, mesmo com status desativado", () => {
		const deactivatedGym: Gym = { ...gym, status: "deactivated" }
		renderWithProviders(<GymRow gym={deactivatedGym} />)
		expect(screen.queryByText("Desativada")).not.toBeInTheDocument()
		expect(screen.getByText("Disponível")).toBeInTheDocument()
	})

	test("o selo de status usa o StatusBadge compartilhado (com ícone semântico)", () => {
		renderWithProviders(<GymRow gym={gym} />)
		const badge = screen.getByText("Disponível").closest("span")
		expect(badge).not.toBeNull()
		expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
	})
})
