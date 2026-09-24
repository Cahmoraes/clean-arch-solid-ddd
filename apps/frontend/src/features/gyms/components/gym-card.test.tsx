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
	status: "activated",
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

	test("sem imagem, a capa do card exibe a cena pixel animada", () => {
		const { container } = renderWithProviders(
			<GymCard gym={{ ...gym, imageKey: null }} />,
		)
		expect(container.querySelector('[data-scene="hero"]')).toHaveAttribute(
			"data-paused",
			"false",
		)
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

	test("mostra o selo 'Desativada' quando a academia está desativada e adminEditHref é informado", () => {
		const deactivatedGym: Gym = { ...gym, status: "deactivated" }
		renderWithProviders(
			<GymCard
				gym={deactivatedGym}
				adminEditHref="/admin/academias/g1/editar"
			/>,
		)
		expect(screen.getByText("Desativada")).toBeInTheDocument()
		expect(screen.queryByText("Disponível")).not.toBeInTheDocument()
	})

	test("não mostra o selo 'Desativada' sem adminEditHref, mesmo com status desativado", () => {
		const deactivatedGym: Gym = { ...gym, status: "deactivated" }
		renderWithProviders(<GymCard gym={deactivatedGym} />)
		expect(screen.queryByText("Desativada")).not.toBeInTheDocument()
		expect(screen.getByText("Disponível")).toBeInTheDocument()
	})

	test("mostra 'Disponível' quando status é 'activated', mesmo para admin", () => {
		const activeGym: Gym = { ...gym, status: "activated" }
		renderWithProviders(
			<GymCard gym={activeGym} adminEditHref="/admin/academias/g1/editar" />,
		)
		expect(screen.getByText("Disponível")).toBeInTheDocument()
		expect(screen.queryByText("Desativada")).not.toBeInTheDocument()
	})

	test("o selo de status usa o StatusBadge compartilhado (com ícone semântico)", () => {
		renderWithProviders(<GymCard gym={gym} />)
		const badge = screen.getByText("Disponível").closest("span")
		expect(badge).not.toBeNull()
		expect((badge as HTMLElement).querySelector("svg")).toBeInTheDocument()
	})

	test("o realce de hover vem do token de glow numa camada sobreposta animada só por opacity", () => {
		renderWithProviders(<GymCard gym={gym} />)
		const wrapper = screen.getByTestId("gym-card-wrapper")
		const glow = screen.getByTestId("gym-card-glow")
		expect(wrapper).not.toHaveClass("transition-shadow")
		expect(wrapper).not.toHaveClass("hover:shadow-glow")
		expect(glow).toHaveClass("shadow-glow", "pointer-events-none")
		expect(glow).toHaveAttribute("aria-hidden", "true")
		expect(glow).not.toHaveClass("transition-shadow")
		expect(glow).toBeEmptyDOMElement()
	})

	test("a pílula Check-in usa o acento (ciano) e o hover vem do token de glow", () => {
		renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByText("Check-in")).toHaveClass(
			"bg-accent",
			"text-accent-foreground",
		)
		expect(screen.getByTestId("gym-card-glow")).toHaveClass("shadow-glow")
	})

	test("o badge é verde (Disponível) e, para admin, vermelho (Desativada)", () => {
		const { rerender } = renderWithProviders(<GymCard gym={gym} />)
		expect(screen.getByText("Disponível")).toHaveClass(
			"bg-success-soft",
			"text-success",
		)
		rerender(
			<GymCard
				gym={{ ...gym, status: "deactivated" }}
				adminEditHref="/admin/academias/g1/editar"
			/>,
		)
		expect(screen.getByText("Desativada")).toHaveClass(
			"bg-destructive-soft",
			"text-destructive",
		)
	})

	test("o botão de editar do admin destaca em ciano no hover, não em magenta", () => {
		renderWithProviders(
			<GymCard gym={gym} adminEditHref="/admin/academias/g1/editar" />,
		)
		const edit = screen.getByTestId("gym-edit-g1")
		expect(edit).toHaveClass("hover:text-accent")
		expect(edit).not.toHaveClass("hover:text-primary")
	})
})
