import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"
import { mockIntersectionObserver, mockMatchMedia } from "@/test/browser-mocks"

let meState: {
	data?: {
		name: string
		email: string
		createdAt: string
		status: string
	}
	isLoading: boolean
} = {
	data: {
		name: "Ana Souza",
		email: "ana@example.com",
		createdAt: "2025-01-12T08:00:00.000Z",
		status: "activated",
	},
	isLoading: false,
}

vi.mock("@/features/profile/api", () => ({
	useMe: () => meState,
	useMetrics: () => ({ data: { checkInsCount: 12 } }),
}))

import { ProfileHeroCard } from "./profile-hero-card"

afterEach(() => {
	vi.unstubAllGlobals()
	meState = {
		data: {
			name: "Ana Souza",
			email: "ana@example.com",
			createdAt: "2025-01-12T08:00:00.000Z",
			status: "activated",
		},
		isLoading: false,
	}
})

describe("ProfileHeroCard", () => {
	test("exibe a cena pixel do hero, decorativa, atrás do conteúdo", () => {
		mockMatchMedia(false)
		mockIntersectionObserver()
		const { container } = render(<ProfileHeroCard thisMonth={4} streak={2} />)
		const scene = container.querySelector('[data-scene="hero"]')
		expect(scene).toBeInTheDocument()
		expect(scene).toHaveAttribute("aria-hidden", "true")
		expect(scene).toHaveAttribute("data-paused", "false")
	})

	test("o texto do card continua acessível com a cena presente", () => {
		render(<ProfileHeroCard thisMonth={4} streak={2} />)
		expect(screen.getByText("Ana Souza")).toBeInTheDocument()
		expect(screen.getByText("ana@example.com")).toBeInTheDocument()
		expect(screen.getByText(/Membro desde/)).toBeInTheDocument()
		expect(screen.getByText("Conta ativa")).toBeInTheDocument()
		expect(screen.getByText("Total")).toBeInTheDocument()
		expect(screen.getByText("Este mês")).toBeInTheDocument()
		expect(screen.getByText("Sequência")).toBeInTheDocument()
		expect(screen.getByText("12")).toBeInTheDocument()
	})

	test("durante o carregamento mostra o esqueleto e nenhuma cena", () => {
		meState = { data: undefined, isLoading: true }
		const { container } = render(<ProfileHeroCard thisMonth={0} streak={0} />)
		expect(container.querySelector("[data-scene]")).toBeNull()
	})

	test("a conta ativa usa o verde semântico de sucesso, não o acento ciano", () => {
		render(<ProfileHeroCard thisMonth={4} streak={2} />)
		expect(screen.getByText("Conta ativa")).toHaveClass(
			"bg-success-soft",
			"text-success",
		)
		expect(screen.getByText("Conta ativa")).not.toHaveClass("bg-accent")
	})

	test("avatar, badge e dot de status do hero não usam rounded-full", () => {
		render(<ProfileHeroCard thisMonth={4} streak={2} />)
		expect(screen.getByTestId("hero-avatar")).not.toHaveClass("rounded-full")
		expect(screen.getByTestId("hero-badge")).not.toHaveClass("rounded-full")
		expect(screen.getByTestId("hero-status-dot")).toHaveClass("rounded-none")
	})
})
