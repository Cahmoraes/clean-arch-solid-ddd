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
	imageKey: "gyms/volt.webp",
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

	test("exibe a imagem da academia no card", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByTestId("gym-image")).toBeInTheDocument()
	})

	test("não exibe o botão de edição quando adminEditHref não é informado", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.queryByTestId("gym-edit-g1")).not.toBeInTheDocument()
	})

	test("exibe o botão de edição com href correto quando adminEditHref é informado", () => {
		renderWithProviders(
			<GymCard gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		const editLink = screen.getByTestId("gym-edit-g1")
		expect(editLink).toBeInTheDocument()
		expect(editLink).toHaveAttribute("href", "/admin/academias/g1/editar")
	})

	test("rotula o botão de edição com o nome da academia", () => {
		renderWithProviders(
			<GymCard gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		expect(
			screen.getByRole("link", { name: "Editar academia VOLT Centro" }),
		).toBeInTheDocument()
	})

	test("mantém o cartão navegável para o detalhe mesmo com o botão de edição", () => {
		renderWithProviders(
			<GymCard gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		expect(screen.getByTestId("gym-card-g1")).toHaveAttribute(
			"href",
			"/academias/g1",
		)
	})

	test("o card principal é envolvido por um motion.div (data-testid gym-card-wrapper)", () => {
		const { container } = renderWithProviders(<GymCard gym={gym} />)
		const wrapper = container.querySelector("[data-testid='gym-card-wrapper']")
		expect(wrapper).toBeInTheDocument()
	})

	test("link do card não possui classes Tailwind de hover legadas", () => {
		renderWithProviders(<GymCard gym={gym} />)
		const link = screen.getByTestId("gym-card-g1")
		expect(link.className).not.toContain("hover:-translate-y-0.5")
		expect(link.className).not.toContain("hover:border-border-strong")
		expect(link.className).not.toContain("transition-[transform,border-color]")
		expect(link.className).not.toContain("group")
	})
})
