import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { renderWithProviders } from "@/test/render"
import { CONTACT_EMAIL } from "../constants"
import { ContactSection } from "./contact-section"

describe("ContactSection", () => {
	test("exibe título, formulário e os dois cards de contato", () => {
		renderWithProviders(<ContactSection />)
		const heading = screen.getByRole("heading", { name: /fale conosco/i })
		expect(heading).toHaveAttribute("id", "contact-heading")
		expect(heading.closest("section")).toHaveAttribute(
			"aria-labelledby",
			"contact-heading",
		)
		expect(heading.closest("section")).toHaveClass(
			"mx-auto",
			"w-full",
			"max-w-xl",
		)
		expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/mensagem/i)).toBeInTheDocument()
		const emailLink = screen.getByRole("link", { name: CONTACT_EMAIL })
		expect(emailLink).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
		expect(emailLink.closest(".grid")).toHaveClass("sm:grid-cols-2")
		expect(screen.getByText("Em até 24h")).toBeInTheDocument()
	})

	test("card de e-mail tem alvo de toque e foco cobrindo o card inteiro", () => {
		renderWithProviders(<ContactSection />)
		const emailLink = screen.getByRole("link", { name: CONTACT_EMAIL })
		expect(emailLink).toHaveClass("after:absolute", "after:inset-0")
		expect(emailLink).toHaveClass(
			"focus-visible:after:ring-2",
			"focus-visible:after:ring-primary",
		)
		expect(emailLink.closest('[data-slot="card"]')).toHaveClass("relative")
	})

	test("card 'Resposta' é alcançável por teclado com foco visível", () => {
		renderWithProviders(<ContactSection />)
		const responseCard = screen.getByRole("group", {
			name: /resposta: em até 24h/i,
		})
		expect(responseCard.tabIndex).toBe(0)
		expect(responseCard).toHaveClass(
			"focus-visible:ring-2",
			"focus-visible:ring-primary",
		)
	})
})
