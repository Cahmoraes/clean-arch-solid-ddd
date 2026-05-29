import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { Gym } from "@/features/gyms/api"
import { renderWithProviders } from "@/test/render"
import { GymCard } from "./gym-card"

const gym: Gym = {
	id: "g1",
	title: "VOLT Centro",
	description: "Academia completa",
	phone: null,
	address: "Rua A, 100",
	latitude: -23.5,
	longitude: -46.6,
}

describe("GymCard VOLT", () => {
	test("exibe o nome da academia", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByText("VOLT Centro")).toBeInTheDocument()
	})

	test("expõe o cartão como link navegável para o detalhe", () => {
		const { container } = renderWithProviders(<GymCard gym={gym} />)
		const link = container.querySelector("a")
		expect(link).toBeInTheDocument()
		expect(link).toHaveAttribute("href", "/academias/g1")
	})

	test("usa a localização disponível como subtítulo", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByText("Rua A, 100")).toBeInTheDocument()
	})
})
