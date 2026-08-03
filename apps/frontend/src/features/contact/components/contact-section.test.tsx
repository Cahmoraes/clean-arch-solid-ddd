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
})
